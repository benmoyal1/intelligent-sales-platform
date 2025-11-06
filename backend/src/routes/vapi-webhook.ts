import { Router } from 'express';
import { db } from '../database';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

export const vapiWebhookRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Vapi Webhook - Receives real-time call events
 *
 * This endpoint receives events from Vapi.ai including:
 * - transcript updates
 * - call status changes
 * - call ended events
 */
vapiWebhookRouter.post('/events', async (req, res) => {
  try {
    const event = req.body;

    console.log('[Vapi Webhook] Received event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'transcript':
        await handleTranscriptUpdate(event);
        break;

      case 'status-update':
        await handleStatusUpdate(event);
        break;

      case 'end-of-call-report':
        await handleEndOfCall(event);
        break;

      default:
        console.log('[Vapi Webhook] Unknown event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Vapi Webhook] Error processing event:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Handle transcript updates - store conversation in real-time
 */
async function handleTranscriptUpdate(event: any) {
  const { call, transcript } = event;

  if (!call?.id || !transcript) return;

  try {
    // Find the call record by Vapi call ID
    const callRecord = db.prepare(`
      SELECT id, conversation FROM calls
      WHERE id = ? OR conversation LIKE ?
    `).get(call.id, `%"vapiCallId":"${call.id}"%`) as any;

    if (!callRecord) {
      console.log('[Vapi Webhook] Call not found:', call.id);
      return;
    }

    // Parse existing conversation
    let conversationData: any = { messages: [] };
    try {
      conversationData = callRecord.conversation ? JSON.parse(callRecord.conversation) : { messages: [] };
      // Handle old format (array) - convert to new format
      if (Array.isArray(conversationData)) {
        conversationData = { vapiCallId: call.id, messages: conversationData };
      }
      // Ensure messages array exists
      if (!conversationData.messages) {
        conversationData.messages = [];
      }
    } catch (e) {
      conversationData = { vapiCallId: call.id, messages: [] };
    }

    // Add new transcript message
    conversationData.messages.push({
      role: transcript.role, // 'user' or 'assistant'
      content: transcript.transcript || transcript.content,
      timestamp: new Date().toISOString(),
    });

    // Update call record
    db.prepare(`
      UPDATE calls
      SET conversation = ?,
          status = 'in_progress'
      WHERE id = ?
    `).run(JSON.stringify(conversationData), callRecord.id);

    console.log(`[Vapi Webhook] Updated conversation for call ${callRecord.id}`);
  } catch (error) {
    console.error('[Vapi Webhook] Error updating transcript:', error);
  }
}

/**
 * Handle status updates
 */
async function handleStatusUpdate(event: any) {
  const { call, status } = event;

  if (!call?.id) return;

  try {
    const callRecord = db.prepare(`
      SELECT id FROM calls
      WHERE id = ? OR conversation LIKE ?
    `).get(call.id, `%"vapiCallId":"${call.id}"%`) as any;

    if (callRecord) {
      db.prepare(`
        UPDATE calls
        SET status = ?
        WHERE id = ?
      `).run(status === 'ringing' ? 'in_progress' : status, callRecord.id);
    }
  } catch (error) {
    console.error('[Vapi Webhook] Error updating status:', error);
  }
}

/**
 * Handle end of call - store final transcript and summary
 */
async function handleEndOfCall(event: any) {
  const { call, transcript, summary, duration } = event;

  if (!call?.id) return;

  try {
    const callRecord = db.prepare(`
      SELECT id, conversation, prospect_id FROM calls
      WHERE id = ? OR conversation LIKE ?
    `).get(call.id, `%"vapiCallId":"${call.id}"%`) as any;

    if (!callRecord) return;

    // Parse existing conversation
    let conversationData: any = { messages: [] };
    try {
      conversationData = callRecord.conversation ? JSON.parse(callRecord.conversation) : { messages: [] };
      // Handle old format (array) - convert to new format
      if (Array.isArray(conversationData)) {
        conversationData = { vapiCallId: call.id, messages: conversationData };
      }
      // Ensure messages array exists
      if (!conversationData.messages) {
        conversationData.messages = [];
      }
    } catch (e) {
      conversationData = { vapiCallId: call.id, messages: [] };
    }

    // Add all transcript messages if available
    if (transcript && Array.isArray(transcript)) {
      transcript.forEach((msg: any) => {
        conversationData.messages.push({
          role: msg.role,
          content: msg.content || msg.transcript,
          timestamp: msg.timestamp || new Date().toISOString(),
        });
      });
    }

    // Determine outcome from call end reason
    let outcome = 'completed';
    if (call.endedReason === 'customer-did-not-answer') {
      outcome = 'no answer';
    } else if (call.endedReason === 'customer-ended-call') {
      outcome = 'customer ended';
    }

    // Analyze conversation to detect meeting scheduling
    const meetingDetection = await analyzeMeetingFromConversation(conversationData.messages);

    // Update call record with final data
    db.prepare(`
      UPDATE calls
      SET conversation = ?,
          status = 'completed',
          outcome = ?,
          meeting_booked = ?,
          duration_seconds = ?,
          completed_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(conversationData),
      meetingDetection.meetingScheduled ? 'meeting scheduled' : outcome,
      meetingDetection.meetingScheduled ? 1 : 0,
      duration || 0,
      new Date().toISOString(),
      callRecord.id
    );

    // Create meeting if one was scheduled
    if (meetingDetection.meetingScheduled && meetingDetection.scheduledTime) {
      await createMeeting(callRecord.prospect_id, callRecord.id, meetingDetection.scheduledTime);
      console.log(`[Vapi Webhook] Meeting created for call ${callRecord.id}`);
    }

    // Update prospect status
    const prospect = db.prepare('SELECT prospect_id FROM calls WHERE id = ?').get(callRecord.id) as any;
    if (prospect) {
      db.prepare('UPDATE prospects SET status = ? WHERE id = ?').run('contacted', prospect.prospect_id);
    }

    console.log(`[Vapi Webhook] Call ${callRecord.id} ended:`, outcome);
  } catch (error) {
    console.error('[Vapi Webhook] Error handling end of call:', error);
  }
}

/**
 * Analyze conversation to detect if a meeting was scheduled
 */
async function analyzeMeetingFromConversation(messages: any[]): Promise<{
  meetingScheduled: boolean;
  scheduledTime: string | null;
}> {
  if (!messages || messages.length === 0) {
    return { meetingScheduled: false, scheduledTime: null };
  }

  try {
    // Build conversation text
    const conversationText = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const analysisPrompt = `Analyze this phone conversation and determine:
1. Did the prospect agree to schedule a meeting? (yes/no)
2. If yes, what time was agreed upon?

Conversation:
${conversationText}

Look for phrases like:
- "Yes, let's do that"
- "Tomorrow works"
- "I'm available"
- "Book me for..."
- Agreement to a specific time

Respond in JSON format:
{
  "meetingScheduled": boolean,
  "scheduledTime": "ISO datetime string or null (estimate based on conversation, default to tomorrow 2 PM if unclear)",
  "confidence": "high/medium/low"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      meetingScheduled: analysis.meetingScheduled || false,
      scheduledTime: analysis.scheduledTime || null,
    };
  } catch (error) {
    console.error('[Vapi Webhook] Failed to analyze meeting:', error);
    return { meetingScheduled: false, scheduledTime: null };
  }
}

/**
 * Create meeting record
 */
async function createMeeting(prospectId: string, callId: string, scheduledTime: string): Promise<void> {
  try {
    const meetingId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO meetings (
        id, prospect_id, call_id, scheduled_time, duration_minutes,
        meeting_type, status, account_manager_name, account_manager_email,
        calendar_link, created_at
      ) VALUES (?, ?, ?, ?, 15, 'discovery', 'scheduled', 'Account Manager', 'am@alta.com', ?, ?)
    `).run(
      meetingId,
      prospectId,
      callId,
      scheduledTime,
      'https://calendar.com/am',
      now
    );

    console.log(`[Vapi Webhook] Meeting created: ${meetingId} for ${scheduledTime}`);
  } catch (error) {
    console.error('[Vapi Webhook] Failed to create meeting:', error);
  }
}
