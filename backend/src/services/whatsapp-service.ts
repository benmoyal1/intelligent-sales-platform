import twilio from 'twilio';
import OpenAI from 'openai';
import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { ALTA_PRODUCT } from '../config/product';

/**
 * WhatsApp Service using Twilio with AI-powered conversations
 *
 * Manages automated WhatsApp conversations with prospects
 */

interface ConversationContext {
  prospectId: string;
  prospectName: string;
  company: string;
  role: string;
  customInstructions?: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  meetingScheduled: boolean;
  shouldContinue: boolean;
}

export class WhatsAppService {
  private client: twilio.Twilio;
  private fromNumber: string;
  private openai: OpenAI;
  private activeConversations: Map<string, ConversationContext> = new Map();

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Start automated WhatsApp campaign with AI conversation
   */
  async startCampaign(prospectId: string, customInstructions?: string): Promise<{ callId: string; status: string }> {
    try {
      // Get prospect info
      const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(prospectId) as any;

      if (!prospect) {
        throw new Error('Prospect not found');
      }

      // Create call record
      const callId = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO calls (id, prospect_id, call_type, status, created_at)
        VALUES (?, ?, 'whatsapp', 'in_progress', ?)
      `).run(callId, prospectId, now);

      // Initialize conversation context
      const context: ConversationContext = {
        prospectId,
        prospectName: prospect.name,
        company: prospect.company,
        role: prospect.role,
        customInstructions,
        conversationHistory: [],
        meetingScheduled: false,
        shouldContinue: true,
      };

      this.activeConversations.set(callId, context);

      // Generate and send initial message
      const initialMessage = await this.generateInitialMessage(context);
      await this.sendMessage(prospect.phone, initialMessage);

      // Store initial message in conversation
      context.conversationHistory.push({
        role: 'assistant',
        content: initialMessage,
      });

      // Update call record with conversation
      db.prepare('UPDATE calls SET conversation = ? WHERE id = ?').run(
        JSON.stringify(context.conversationHistory),
        callId
      );

      console.log(`[WhatsApp] Campaign started for ${prospect.name} - Call ID: ${callId}`);

      return {
        callId,
        status: 'in_progress',
      };
    } catch (error) {
      console.error('[WhatsApp] Failed to start campaign:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WhatsApp message from prospect
   */
  async handleIncomingMessage(from: string, message: string): Promise<void> {
    try {
      // Find active conversation by phone number
      const callId = await this.findActiveConversationByPhone(from);

      if (!callId) {
        console.log(`[WhatsApp] No active conversation found for ${from}`);
        return;
      }

      const context = this.activeConversations.get(callId);
      if (!context) {
        console.log(`[WhatsApp] Context not found for call ${callId}`);
        return;
      }

      // Add user message to conversation
      context.conversationHistory.push({
        role: 'user',
        content: message,
      });

      // Generate AI response
      const response = await this.generateResponse(context, message);

      // Add assistant response to conversation
      context.conversationHistory.push({
        role: 'assistant',
        content: response.message,
      });

      // Send response via WhatsApp
      const cleanPhone = from.replace('whatsapp:', '');
      await this.sendMessage(cleanPhone, response.message);

      // Update conversation in database
      db.prepare('UPDATE calls SET conversation = ? WHERE id = ?').run(
        JSON.stringify(context.conversationHistory),
        callId
      );

      // Check if conversation should end
      if (response.meetingScheduled) {
        context.meetingScheduled = true;
        context.shouldContinue = false;

        // Create meeting record
        if (response.scheduledTime) {
          await this.createMeeting(context.prospectId, callId, response.scheduledTime);
        }

        await this.endConversation(callId, 'success - meeting scheduled');
      } else if (response.shouldEnd) {
        context.shouldContinue = false;
        await this.endConversation(callId, response.outcome || 'no interest');
      }
    } catch (error) {
      console.error('[WhatsApp] Error handling incoming message:', error);
    }
  }

  /**
   * Generate initial AI message
   */
  private async generateInitialMessage(context: ConversationContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the initial outreach message to start the conversation.' },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0].message.content || 'Hi! I wanted to reach out about an opportunity.';
  }

  /**
   * Generate AI response to prospect message
   */
  private async generateResponse(
    context: ConversationContext,
    userMessage: string
  ): Promise<{
    message: string;
    meetingScheduled: boolean;
    shouldEnd: boolean;
    outcome?: string;
    scheduledTime?: string;
  }> {
    const systemPrompt = this.buildSystemPrompt(context);

    // Build messages array with conversation history
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
    ];

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const responseText = completion.choices[0].message.content || '';

    // Analyze response for meeting scheduling and conversation ending
    const analysis = await this.analyzeResponse(responseText, userMessage, context);

    return {
      message: responseText,
      ...analysis,
    };
  }

  /**
   * Analyze AI response to detect meeting scheduling and conversation end
   */
  private async analyzeResponse(
    responseText: string,
    userMessage: string,
    context: ConversationContext
  ): Promise<{
    meetingScheduled: boolean;
    shouldEnd: boolean;
    outcome?: string;
    scheduledTime?: string;
  }> {
    const analysisPrompt = `
Analyze this WhatsApp conversation exchange and determine:
1. Has the prospect agreed to schedule a meeting? (yes/no)
2. Should the conversation end? (yes/no)
3. What is the outcome? (interested/not interested/meeting scheduled/need more info)
4. If a meeting was scheduled, extract the agreed time in ISO format (e.g., "2025-11-06T14:00:00")

User message: "${userMessage}"
Agent response: "${responseText}"

Conversation context: ${context.conversationHistory.length} messages exchanged

Respond in JSON format:
{
  "meetingScheduled": boolean,
  "shouldEnd": boolean,
  "outcome": string,
  "scheduledTime": "ISO datetime string or null"
}
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    try {
      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        meetingScheduled: analysis.meetingScheduled || false,
        shouldEnd: analysis.shouldEnd || false,
        outcome: analysis.outcome,
        scheduledTime: analysis.scheduledTime,
      };
    } catch (error) {
      console.error('[WhatsApp] Failed to parse analysis:', error);
      return {
        meetingScheduled: false,
        shouldEnd: false,
      };
    }
  }

  /**
   * Build AI system prompt for conversations
   */
  private buildSystemPrompt(context: ConversationContext): string {
    let prompt = `You are Ben Moyal from Alta, reaching out via WhatsApp to ${context.prospectName}, ${context.role} at ${context.company}.

YOUR GOAL: Book a 15-minute meeting - FAST.

PRODUCT: ${ALTA_PRODUCT.description}
Key Benefit: ${ALTA_PRODUCT.keyFeatures[0] || 'Streamline operations and boost efficiency'}

SIMPLE FLOW:
1. Intro: "Hi ${context.prospectName}, this is Ben Moyal from Alta. Is this a good time?"
2. Quick value: Pick ONE relevant benefit
3. Propose meeting: "Would you be open to a quick 15-min call tomorrow or Thursday?"

MEETING TIMES: Tomorrow or day after at 10 AM, 2 PM, or 4 PM

STRICT RULES:
- Keep messages SHORT (1-2 sentences for WhatsApp)
- Get to scheduling in 3-4 messages
- If busy: "When works better?"
- If not interested twice: End politely with "Thanks anyway!"
- If they say "stop" or "not interested": End immediately and respectfully
`;

    if (context.customInstructions) {
      prompt += `\n\nCUSTOM INSTRUCTIONS:\n${context.customInstructions}\n\nFollow these carefully.`;
    }

    return prompt;
  }

  /**
   * Send WhatsApp message
   */
  private async sendMessage(to: string, message: string): Promise<void> {
    try {
      // Ensure phone number is in WhatsApp format
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      await this.client.messages.create({
        from: this.fromNumber,
        to: toNumber,
        body: message,
      });

      console.log(`[WhatsApp] Message sent to ${to}`);
    } catch (error) {
      console.error('[WhatsApp] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Find active conversation by phone number
   */
  private async findActiveConversationByPhone(phone: string): Promise<string | null> {
    try {
      // Clean phone number
      const cleanPhone = phone.replace('whatsapp:', '');

      // Find prospect by phone
      const prospect = db.prepare('SELECT id FROM prospects WHERE phone = ?').get(cleanPhone) as any;

      if (!prospect) {
        return null;
      }

      // Find active WhatsApp call for this prospect
      const call = db.prepare(`
        SELECT id FROM calls
        WHERE prospect_id = ?
        AND call_type = 'whatsapp'
        AND status = 'in_progress'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(prospect.id) as any;

      return call ? call.id : null;
    } catch (error) {
      console.error('[WhatsApp] Error finding conversation:', error);
      return null;
    }
  }

  /**
   * Create meeting record when prospect agrees
   */
  private async createMeeting(prospectId: string, callId: string, scheduledTime: string): Promise<void> {
    try {
      const meetingId = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO meetings (
          id, prospect_id, call_id, scheduled_time, duration_minutes,
          meeting_type, status, account_manager_name, account_manager_email,
          created_at
        ) VALUES (?, ?, ?, ?, 15, 'discovery', 'scheduled', 'Account Manager', 'am@alta.com', ?)
      `).run(meetingId, prospectId, callId, scheduledTime, now);

      // Update call record
      db.prepare('UPDATE calls SET meeting_booked = 1 WHERE id = ?').run(callId);

      console.log(`[WhatsApp] Meeting created: ${meetingId}`);
    } catch (error) {
      console.error('[WhatsApp] Failed to create meeting:', error);
    }
  }

  /**
   * End conversation and update records
   */
  private async endConversation(callId: string, outcome: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE calls
        SET status = 'completed', outcome = ?, completed_at = ?
        WHERE id = ?
      `).run(outcome, now, callId);

      // Remove from active conversations
      this.activeConversations.delete(callId);

      // Update prospect status
      const call = db.prepare('SELECT prospect_id FROM calls WHERE id = ?').get(callId) as any;
      if (call) {
        db.prepare('UPDATE prospects SET status = ? WHERE id = ?').run('contacted', call.prospect_id);
      }

      console.log(`[WhatsApp] Conversation ended: ${callId} - ${outcome}`);
    } catch (error) {
      console.error('[WhatsApp] Failed to end conversation:', error);
    }
  }

}

// Export singleton instance
export const whatsappService = new WhatsAppService();
