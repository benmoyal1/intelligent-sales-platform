import { CallContext, CallResult, ConversationState, AgentTool } from '../types';

/**
 * Call Agent
 *
 * The brain of the voice AI. Manages conversation flow, handles real-time
 * decision making, and orchestrates tool usage during calls.
 *
 * Note: This agent works in conjunction with a voice platform (Twilio + OpenAI Realtime
 * or Vapi.ai) but contains the core reasoning logic and prompt construction.
 */
export class CallAgent {
  private tools: Map<string, AgentTool>;

  constructor() {
    this.tools = new Map();
    this.registerTools();
  }

  /**
   * Build the system prompt for the call based on context
   */
  buildSystemPrompt(context: CallContext): string {
    const { prospect_info, account_manager, conversation_state } = context;

    return `You are Katie, an AI Sales Development Representative making an outbound call to book meetings for senior account managers.

PERSONALITY & TONE:
- Professional yet warm and conversational (not robotic)
- Confident but not pushy
- Listen actively and adapt to the prospect's energy and tone
- Use natural conversational fillers ("um", "you know") occasionally to sound human
- Mirror the prospect's communication style (formal vs casual)

YOUR OBJECTIVE:
Book a qualified meeting between ${prospect_info.prospect.name} and ${account_manager.name}, our ${account_manager.specialty}.

PROSPECT CONTEXT:
Name: ${prospect_info.prospect.name}
Role: ${prospect_info.prospect.role}
Company: ${prospect_info.prospect.company}

KEY INSIGHTS:
${this.formatTalkingPoints(prospect_info.talking_points)}

LIKELY PAIN POINTS:
${this.formatPainPoints(prospect_info.pain_points)}

CONVERSATION FRAMEWORK:

1. OPENING (First 15 seconds - CRITICAL)
   - Confirm identity: "Hi, is this ${prospect_info.prospect.name}?"
   - Brief introduction: "This is Katie with [Company]"
   - Permission-based opener: "Did I catch you at a good time for a quick call?"
   - If no: Offer to call back at better time
   - If yes: Proceed to value prop

2. VALUE PROPOSITION (15-30 seconds)
   - Lead with relevance: Use one key insight from talking points
   - Pattern interrupt: Don't sound like typical sales call
   - Example: "I noticed [specific trigger], and wanted to reach out because we've helped similar [industry] companies..."

3. DISCOVERY (2-3 minutes)
   - Ask open-ended questions about their challenges
   - Listen for confirmation of pain points
   - Probe deeper on areas of interest
   - Build rapport through active listening

4. QUALIFICATION (BANT - Must complete before booking)
   Budget: "What's your typical budget range for [solution type]?"
   Authority: "Who else would be involved in evaluating this?"
   Need: Confirmed through discovery questions
   Timeline: "When are you looking to have something in place?"

5. MEETING BOOKING (Only if qualified)
   - Transition: "This sounds like exactly what ${account_manager.name} specializes in..."
   - Propose value: "They can show you [specific outcome] based on your [specific situation]"
   - Offer options: "I have some time slots next week - are you open Tuesday or Thursday afternoon?"
   - Confirm details: Email, timezone, any specific topics to cover

OBJECTION HANDLING:
${this.formatObjectionStrategies(prospect_info.objection_strategies)}

CRITICAL RULES:
- Never exceed 3 sentences in a single response (unless explaining something complex)
- If prospect says "not interested" or equivalent twice, gracefully end call
- Never make promises about product capabilities you're unsure of
- Always confirm email address and timing before finalizing meeting
- If prospect is clearly busy, offer callback instead of pushing
- Use check_calendar_availability tool before suggesting specific times
- Use book_meeting tool only after BANT qualification complete

CURRENT CONVERSATION STATE:
Stage: ${conversation_state.stage}
Turn: ${conversation_state.turns}
Sentiment: ${conversation_state.sentiment.toFixed(2)}

Your responses should be natural, conversational, and human-like. You're having a conversation, not reading a script.`;
  }

  /**
   * Register tools available to the agent during calls
   */
  private registerTools() {
    this.tools.set('check_calendar_availability', {
      name: 'check_calendar_availability',
      description: 'Check account manager availability for potential meeting times',
      parameters: {
        type: 'object',
        properties: {
          preferred_dates: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of preferred dates in ISO format',
          },
          duration_minutes: {
            type: 'number',
            description: 'Meeting duration in minutes',
            default: 30,
          },
        },
        required: ['preferred_dates'],
      },
      handler: async (params) => {
        // This would call actual calendar service
        return {
          available_slots: [
            { datetime: '2025-01-15T10:00:00Z', available: true },
            { datetime: '2025-01-15T14:00:00Z', available: true },
            { datetime: '2025-01-16T11:00:00Z', available: false },
          ],
        };
      },
    });

    this.tools.set('book_meeting', {
      name: 'book_meeting',
      description: 'Book a meeting after qualification is complete',
      parameters: {
        type: 'object',
        properties: {
          datetime: {
            type: 'string',
            description: 'Meeting datetime in ISO format',
          },
          prospect_email: {
            type: 'string',
            description: 'Prospect email address',
          },
          meeting_type: {
            type: 'string',
            description: 'Type of meeting (demo, discovery, consultation)',
          },
          notes: {
            type: 'string',
            description: 'Any specific topics or notes for the meeting',
          },
        },
        required: ['datetime', 'prospect_email', 'meeting_type'],
      },
      handler: async (params) => {
        // This would call actual booking service
        return {
          booking_confirmed: true,
          calendar_invite_sent: true,
          confirmation_email_sent: true,
          meeting_id: 'mtg_' + Math.random().toString(36).substr(2, 9),
        };
      },
    });

    this.tools.set('end_call', {
      name: 'end_call',
      description: 'End the call gracefully with appropriate follow-up action',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            enum: ['meeting_booked', 'not_interested', 'callback_requested', 'not_qualified'],
            description: 'Reason for ending call',
          },
          follow_up_action: {
            type: 'string',
            description: 'What should happen next (send email, schedule callback, etc)',
          },
          callback_datetime: {
            type: 'string',
            description: 'If callback requested, when to call back (ISO format)',
          },
        },
        required: ['reason', 'follow_up_action'],
      },
      handler: async (params) => {
        return {
          call_ended: true,
          follow_up_scheduled: !!params.callback_datetime,
        };
      },
    });

    this.tools.set('update_qualification_status', {
      name: 'update_qualification_status',
      description: 'Update BANT qualification status during discovery',
      parameters: {
        type: 'object',
        properties: {
          budget_confirmed: { type: 'boolean' },
          authority_confirmed: { type: 'boolean' },
          need_identified: { type: 'boolean' },
          timeline_discussed: { type: 'boolean' },
          notes: { type: 'string' },
        },
      },
      handler: async (params) => {
        // Update conversation state
        return { qualification_updated: true };
      },
    });
  }

  /**
   * Get tools in OpenAI function calling format
   */
  getToolsForAPI(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Handle tool calls from the LLM during conversation
   */
  async handleToolCall(toolName: string, parameters: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      return await tool.handler(parameters);
    } catch (error) {
      console.error(`Tool execution error for ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze call outcome and generate structured result
   */
  analyzeCallOutcome(
    callTranscript: string,
    conversationState: ConversationState,
    toolCallsUsed: any[]
  ): Omit<CallResult, 'call_id' | 'duration_seconds'> {
    // Check if meeting was booked
    const meetingBooked = toolCallsUsed.some(tc => tc.name === 'book_meeting');

    // Determine outcome
    let outcome: CallResult['outcome'];
    if (meetingBooked) {
      outcome = 'meeting_booked';
    } else if (conversationState.stage === 'closing' && conversationState.sentiment > 0.5) {
      outcome = 'follow_up';
    } else if (conversationState.objections_raised.length > 2) {
      outcome = 'not_interested';
    } else {
      outcome = 'callback';
    }

    // Extract meeting details if booked
    let meetingDetails;
    if (meetingBooked) {
      const bookingCall = toolCallsUsed.find(tc => tc.name === 'book_meeting');
      meetingDetails = {
        datetime: new Date(bookingCall.parameters.datetime),
        duration_minutes: 30,
        meeting_type: bookingCall.parameters.meeting_type,
        account_manager_id: '', // Would be filled from context
        prospect_email: bookingCall.parameters.prospect_email,
      };
    }

    return {
      status: 'completed',
      transcript: callTranscript,
      sentiment_score: conversationState.sentiment,
      outcome,
      meeting_booked: meetingBooked,
      meeting_details: meetingDetails,
      next_action: this.determineNextAction(outcome, conversationState),
    };
  }

  /**
   * Determine next action based on call outcome
   */
  private determineNextAction(outcome: CallResult['outcome'], state: ConversationState): string {
    switch (outcome) {
      case 'meeting_booked':
        return 'Send meeting confirmation and prep materials';
      case 'follow_up':
        return 'Send follow-up email with relevant case studies';
      case 'callback':
        return 'Schedule callback for discussed timeframe';
      case 'not_interested':
        return 'Mark as unqualified, no further outreach';
      default:
        return 'Review call and determine appropriate follow-up';
    }
  }

  // Helper formatting methods
  private formatTalkingPoints(points: string[]): string {
    return points.map((p, i) => `${i + 1}. ${p}`).join('\n');
  }

  private formatPainPoints(points: string[]): string {
    return points.map((p, i) => `- ${p}`).join('\n');
  }

  private formatObjectionStrategies(strategies: Record<string, string>): string {
    return Object.entries(strategies)
      .map(([objection, strategy]) => `Objection: "${objection}"\nResponse: ${strategy}\n`)
      .join('\n');
  }
}
