import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { authenticateToken } from '../middleware/auth';
import { CallAgentService } from '../services/call-agent';
import { RealVoiceService } from '../services/voice-service-real';
import { whatsappService } from '../services/whatsapp-service';

export const callsRouter = Router();
const callAgent = new CallAgentService();
const voiceService = new RealVoiceService(callAgent);

// Get all calls
callsRouter.get('/', authenticateToken, (req, res) => {
  try {
    const calls = db
      .prepare(
        `SELECT c.*, p.name as prospect_name, p.company
         FROM calls c
         JOIN prospects p ON c.prospect_id = p.id
         ORDER BY c.created_at DESC`
      )
      .all();
    res.json(calls);
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Get single call
callsRouter.get('/:id', authenticateToken, (req, res) => {
  try {
    const call = db
      .prepare(
        `SELECT c.*, p.name as prospect_name, p.company, p.role
         FROM calls c
         JOIN prospects p ON c.prospect_id = p.id
         WHERE c.id = ?`
      )
      .get(req.params.id);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    res.json(call);
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

// Start a new call (voice or WhatsApp)
callsRouter.post('/start', authenticateToken, async (req, res) => {
  try {
    const { prospect_id, call_type = 'voice' } = req.body;

    if (!prospect_id) {
      return res.status(400).json({ error: 'Prospect ID required' });
    }

    if (!['voice', 'whatsapp'].includes(call_type)) {
      return res.status(400).json({ error: 'Invalid call_type. Must be "voice" or "whatsapp"' });
    }

    // Get prospect
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(prospect_id) as any;

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    // For WhatsApp, research is not required - start campaign immediately
    if (call_type === 'whatsapp') {
      console.log(`[Calls] Starting WhatsApp campaign for ${prospect.name}`);

      const result = await whatsappService.startCampaign(
        prospect_id,
        prospect.custom_instructions || undefined
      );

      return res.json({
        call_id: result.callId,
        status: result.status,
        call_type: 'whatsapp',
        message: 'WhatsApp campaign started successfully',
      });
    }

    // For voice calls, require research data
    if (!prospect.research_data) {
      return res.status(400).json({ error: 'Prospect must be researched first for voice calls' });
    }

    const research = JSON.parse(prospect.research_data);

    // Build call context for real voice call
    const callContext = {
      prospect_info: {
        prospect: {
          id: prospect.id,
          name: prospect.name,
          company: prospect.company,
          role: prospect.role,
        },
        crm_data: {
          industry: prospect.industry,
          account_status: prospect.status,
          past_interactions: [],
        },
        talking_points: research.talking_points,
        pain_points: research.pain_points,
        objection_strategies: research.objection_strategies,
        success_probability: research.success_probability,
      },
      call_objective: 'book a discovery meeting',
      account_manager: {
        id: 'am-001',
        name: 'Account Manager',
        email: 'am@company.com',
        specialty: 'Sales',
        calendar_link: 'https://calendar.com/am',
      },
      conversation_state: {
        stage: 'opening' as const,
        turns: 0,
        sentiment: 0.5,
        objections_raised: [],
      },
      campaign_id: 'main-campaign',
    };

    console.log(`[Calls] Making REAL call to ${prospect.name} at ${prospect.phone}`);

    // Add custom instructions if provided
    if (prospect.custom_instructions) {
      console.log(`[Calls] Using custom instructions: ${prospect.custom_instructions}`);
    }

    // Make the REAL phone call via Vapi!
    const vapiCall = await voiceService.makeRealCall(
      prospect.phone,
      callContext,
      prospect.custom_instructions || undefined
    );

    // Create call record in database with Vapi call ID for webhook tracking
    const callId = uuidv4();
    const initialConversation = JSON.stringify([
      {
        vapiCallId: vapiCall.callId,
        timestamp: new Date().toISOString(),
        status: 'initiated',
      },
    ]);

    db.prepare(
      `INSERT INTO calls (id, prospect_id, status, conversation, call_type)
       VALUES (?, ?, 'in_progress', ?, 'voice')`
    ).run(callId, prospect_id, initialConversation);

    console.log(`[Calls] Real call initiated! Vapi Call ID: ${vapiCall.callId}`);

    res.json({
      call_id: callId,
      vapi_call_id: vapiCall.callId,
      prospect_name: prospect.name,
      phone: prospect.phone,
      opening_message: `Real phone call initiated to ${prospect.phone}. The prospect's phone should ring shortly!`,
    });
  } catch (error: any) {
    console.error('Start call error:', error);
    res.status(500).json({ error: error.message || 'Failed to start call' });
  }
});

// Send message in active call
callsRouter.post('/:id/message', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const callId = req.params.id;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Get call
    const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId) as any;

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.status !== 'active') {
      return res.status(400).json({ error: 'Call is not active' });
    }

    // Get AI response
    const response = await callAgent.sendMessage(callId, message);

    // Update conversation
    const conversation = JSON.parse(call.conversation);
    conversation.push(
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: response, timestamp: new Date().toISOString() }
    );

    db.prepare('UPDATE calls SET conversation = ? WHERE id = ?').run(
      JSON.stringify(conversation),
      callId
    );

    // Analyze conversation
    const analysis = callAgent.analyzeConversation(callId);

    res.json({
      response,
      analysis,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// End call
callsRouter.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { outcome, meeting_booked, scheduled_time } = req.body;
    const callId = req.params.id;

    const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId) as any;

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Analyze final conversation
    const analysis = callAgent.analyzeConversation(callId);
    const conversation = JSON.parse(call.conversation);
    const duration = conversation.length * 15; // Rough estimate: 15 seconds per turn

    // Update call
    db.prepare(
      `UPDATE calls
       SET status = 'completed',
           outcome = ?,
           meeting_booked = ?,
           sentiment_score = ?,
           duration_seconds = ?,
           completed_at = datetime('now')
       WHERE id = ?`
    ).run(outcome || analysis.next_action, meeting_booked ? 1 : 0, analysis.sentiment, duration, callId);

    // Create meeting if one was booked
    if (meeting_booked) {
      const meetingId = uuidv4();
      const meetingTime = scheduled_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default to tomorrow

      db.prepare(`
        INSERT INTO meetings (
          id, prospect_id, call_id, scheduled_time, duration_minutes,
          meeting_type, status, account_manager_name, account_manager_email,
          calendar_link, created_at
        ) VALUES (?, ?, ?, ?, 15, 'discovery', 'scheduled', 'Account Manager', 'am@alta.com', 'https://calendar.com/am', datetime('now'))
      `).run(meetingId, call.prospect_id, callId, meetingTime);

      console.log(`[Calls] Meeting created: ${meetingId} for ${meetingTime}`);
    }

    // Update prospect status
    db.prepare("UPDATE prospects SET status = 'contacted' WHERE id = ?").run(call.prospect_id);

    // Clean up agent memory
    callAgent.endCall(callId);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get call conversation (for real-time updates)
callsRouter.get('/:id/conversation', authenticateToken, (req, res) => {
  try {
    const call = db
      .prepare('SELECT conversation, status, call_type FROM calls WHERE id = ?')
      .get(req.params.id) as any;

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    let conversation = [];
    if (call.conversation) {
      try {
        const parsed = JSON.parse(call.conversation);
        // Handle new format (object with messages array) or old format (array)
        if (Array.isArray(parsed)) {
          conversation = parsed;
        } else if (parsed && Array.isArray(parsed.messages)) {
          conversation = parsed.messages;
        } else {
          conversation = [];
        }
      } catch (e) {
        console.error('Failed to parse conversation:', e);
      }
    }

    res.json({
      conversation,
      status: call.status,
      call_type: call.call_type,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// End an active call (for voice calls via Vapi)
callsRouter.post('/:id/end-active', authenticateToken, async (req, res) => {
  try {
    const callId = req.params.id;

    const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId) as any;

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // If it's a voice call, try to end it via Vapi
    if (call.call_type === 'voice' && call.status === 'in_progress') {
      // Parse conversation to get Vapi call ID
      let vapiCallId = null;
      try {
        const conversationData = JSON.parse(call.conversation || '{}');
        // Handle new format (object with vapiCallId) or old format (array)
        if (conversationData.vapiCallId) {
          vapiCallId = conversationData.vapiCallId;
        } else if (Array.isArray(conversationData)) {
          const initMessage = conversationData.find((msg: any) => msg.vapiCallId);
          vapiCallId = initMessage?.vapiCallId;
        }
      } catch (e) {
        console.error('Failed to parse conversation:', e);
      }

      if (vapiCallId) {
        try {
          await voiceService.endCall(vapiCallId);
          console.log(`[Calls] Ended Vapi call: ${vapiCallId}`);
        } catch (error) {
          console.error('[Calls] Failed to end Vapi call:', error);
        }
      }
    }

    // Update call status in database
    db.prepare(`
      UPDATE calls
      SET status = 'completed',
          outcome = 'ended by user',
          completed_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), callId);

    // Update prospect status
    db.prepare("UPDATE prospects SET status = 'contacted' WHERE id = ?").run(call.prospect_id);

    res.json({ success: true, message: 'Call ended successfully' });
  } catch (error) {
    console.error('End active call error:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get call stats
callsRouter.get('/stats/summary', authenticateToken, (req, res) => {
  try {
    // Get call statistics
    const callStats = db.prepare(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        AVG(sentiment_score) as avg_sentiment,
        AVG(duration_seconds) as avg_duration
      FROM calls
    `).get() as any;

    // Get actual meeting count from meetings table
    const meetingStats = db.prepare(`
      SELECT COUNT(*) as meetings_booked
      FROM meetings
    `).get() as any;

    // Combine statistics
    const stats = {
      ...callStats,
      meetings_booked: meetingStats.meetings_booked || 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
