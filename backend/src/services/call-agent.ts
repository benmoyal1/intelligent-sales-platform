import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallContext {
  prospect_name: string;
  prospect_role: string;
  company: string;
  talking_points: string[];
  pain_points: string[];
  objection_strategies: Record<string, string>;
}

export class CallAgentService {
  private conversations: Map<string, ConversationMessage[]> = new Map();

  async startCall(callId: string, context: CallContext): Promise<string> {
    console.log(`[CallAgent] Starting call ${callId} with ${context.prospect_name}`);

    const systemPrompt = this.buildSystemPrompt(context);

    const messages: ConversationMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    this.conversations.set(callId, messages);

    // Generate opening message
    const opening = await this.generateResponse(callId, null);
    return opening;
  }

  async sendMessage(callId: string, userMessage: string): Promise<string> {
    console.log(`[CallAgent] ${callId} - User: ${userMessage}`);

    const response = await this.generateResponse(callId, userMessage);

    console.log(`[CallAgent] ${callId} - Agent: ${response}`);

    return response;
  }

  private async generateResponse(callId: string, userMessage: string | null): Promise<string> {
    const conversation = this.conversations.get(callId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Add user message if provided
    if (userMessage) {
      conversation.push({
        role: 'user',
        content: userMessage,
      });
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversation,
        temperature: 0.7,
        max_tokens: 150,
      });

      const assistantMessage = response.choices[0].message.content || '';

      // Store assistant response
      conversation.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('[CallAgent] Error generating response:', error);
      throw error;
    }
  }

  getConversationHistory(callId: string): ConversationMessage[] {
    return this.conversations.get(callId) || [];
  }

  analyzeConversation(callId: string): {
    sentiment: number;
    qualification_status: string;
    next_action: string;
  } {
    const conversation = this.conversations.get(callId) || [];

    // Simple sentiment analysis (in production, use proper NLP)
    const text = conversation
      .filter(m => m.role === 'user')
      .map(m => m.content.toLowerCase())
      .join(' ');

    let sentiment = 0.5; // neutral

    // Positive indicators
    if (text.includes('interested') || text.includes('yes') || text.includes('sounds good')) {
      sentiment += 0.2;
    }

    // Negative indicators
    if (text.includes('not interested') || text.includes('no thanks') || text.includes('busy')) {
      sentiment -= 0.3;
    }

    // Determine qualification
    let qualification = 'unknown';
    if (text.includes('budget') || text.includes('pricing')) qualification = 'budget_discussed';
    if (text.includes('team') || text.includes('decision')) qualification = 'authority_identified';
    if (conversation.length > 10) qualification = 'qualified';

    // Determine next action
    let nextAction = 'continue_conversation';
    if (sentiment > 0.7) nextAction = 'attempt_booking';
    if (sentiment < 0.3) nextAction = 'graceful_exit';

    return {
      sentiment: Math.max(0, Math.min(1, sentiment)),
      qualification_status: qualification,
      next_action: nextAction,
    };
  }

  buildSystemPrompt(context: CallContext | any): string {
    // Handle both old flat structure and new nested structure
    const prospectName = context.prospect_name || context.prospect_info?.prospect?.name || 'the prospect';
    const prospectRole = context.prospect_role || context.prospect_info?.prospect?.role || 'their role';
    const company = context.company || context.prospect_info?.prospect?.company || 'their company';
    const talkingPoints = context.talking_points || context.prospect_info?.talking_points || [];
    const painPoints = context.pain_points || context.prospect_info?.pain_points || [];
    const objectionStrategies = context.objection_strategies || context.prospect_info?.objection_strategies || {};

    return `You are Katie, an AI Sales Development Representative making an outbound call.

PERSONALITY:
- Professional yet warm and conversational
- Listen actively and adapt to prospect's tone
- Keep responses under 3 sentences
- Sound natural, not robotic

YOUR OBJECTIVE:
Book a qualified meeting between ${prospectName} and our account manager.

PROSPECT CONTEXT:
Name: ${prospectName}
Role: ${prospectRole}
Company: ${company}

KEY INSIGHTS:
${talkingPoints.length > 0 ? talkingPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') : '- General value proposition for their industry'}

LIKELY PAIN POINTS:
${painPoints.length > 0 ? painPoints.map((p: string) => `- ${p}`).join('\n') : '- Common challenges in their role'}

OBJECTION HANDLING:
${Object.keys(objectionStrategies).length > 0
  ? Object.entries(objectionStrategies)
      .map(([obj, strategy]) => `If "${obj}": ${strategy}`)
      .join('\n')
  : '- Listen actively and address concerns with empathy'}

CONVERSATION FRAMEWORK:
1. Opening: Confirm you're speaking with ${prospectName}, ask if it's a good time
2. Value Prop: Briefly mention why you're calling (use insights above)
3. Discovery: Ask about their current challenges
4. Qualification: Understand budget, authority, need, timeline
5. Booking: If qualified, suggest meeting times

RULES:
- Keep responses conversational and under 3 sentences
- If prospect says "not interested" twice, gracefully exit
- Ask questions to understand their situation
- Never make false promises
- Be genuine and helpful

Start the conversation naturally.`;
  }

  endCall(callId: string): void {
    this.conversations.delete(callId);
  }
}
