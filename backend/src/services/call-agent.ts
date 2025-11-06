import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ConversationMessage {
  role: "system" | "user" | "assistant";
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
    console.log(
      `[CallAgent] Starting call ${callId} with ${context.prospect_name}`
    );

    const systemPrompt = this.buildSystemPrompt(context);

    const messages: ConversationMessage[] = [
      {
        role: "system",
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

  private async generateResponse(
    callId: string,
    userMessage: string | null
  ): Promise<string> {
    const conversation = this.conversations.get(callId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Add user message if provided
    if (userMessage) {
      conversation.push({
        role: "user",
        content: userMessage,
      });
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: conversation,
        temperature: 0.7,
        max_tokens: 150,
      });

      const assistantMessage = response.choices[0].message.content || "";

      // Store assistant response
      conversation.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error("[CallAgent] Error generating response:", error);
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
      .filter((m) => m.role === "user")
      .map((m) => m.content.toLowerCase())
      .join(" ");

    let sentiment = 0.5; // neutral

    // Positive indicators
    if (
      text.includes("interested") ||
      text.includes("yes") ||
      text.includes("sounds good")
    ) {
      sentiment += 0.2;
    }

    // Negative indicators
    if (
      text.includes("not interested") ||
      text.includes("no thanks") ||
      text.includes("busy")
    ) {
      sentiment -= 0.3;
    }

    // Determine qualification
    let qualification = "unknown";
    if (text.includes("budget") || text.includes("pricing"))
      qualification = "budget_discussed";
    if (text.includes("team") || text.includes("decision"))
      qualification = "authority_identified";
    if (conversation.length > 10) qualification = "qualified";

    // Determine next action
    let nextAction = "continue_conversation";
    if (sentiment > 0.7) nextAction = "attempt_booking";
    if (sentiment < 0.3) nextAction = "graceful_exit";

    return {
      sentiment: Math.max(0, Math.min(1, sentiment)),
      qualification_status: qualification,
      next_action: nextAction,
    };
  }

  buildSystemPrompt(context: CallContext | any): string {
    // Handle both old flat structure and new nested structure
    const prospectName =
      context.prospect_name ||
      context.prospect_info?.prospect?.name ||
      "the prospect";
    const prospectRole =
      context.prospect_role ||
      context.prospect_info?.prospect?.role ||
      "their role";
    const company =
      context.company ||
      context.prospect_info?.prospect?.company ||
      "their company";
    const talkingPoints =
      context.talking_points || context.prospect_info?.talking_points || [];

    return `You are Ben Moyal, a Sales Development Representative from Alta. Your ONLY goal is to book a 15-minute meeting - FAST.

PROSPECT INFO:
- Name: ${prospectName}
- Role: ${prospectRole}
- Company: ${company}

SIMPLE CONVERSATION FLOW (Keep it DIRECT):
1. INTRODUCE: "Hi, this is Ben Moyal from Alta. Is this ${prospectName}?"
2. CHECK TIME: "Do you have just 30 seconds?"
3. VALUE PROP: "We help ${prospectRole}s at companies like ${company} with [brief value]."
4. QUICK VALUE: Pick ONE key benefit: ${
      talkingPoints.length > 0
        ? talkingPoints[0]
        : "streamline operations and increase efficiency"
    }
5. PROPOSE MEETING: "Would you be open to a quick 15-minute call tomorrow or Thursday?"

STRICT RULES:
- Keep EVERY response under 2 sentences (this is critical for phone calls)
- Get to scheduling within 3-4 exchanges
- If they're busy: "What day works better - tomorrow or next week?"
- If not interested after asking twice: Thank them politely and hang up the call
- Don't ask discovery questions - focus on booking only

Start with: "Hi, this is Ben Moyal from Alta. Is this ${prospectName}?"`;
  }

  endCall(callId: string): void {
    this.conversations.delete(callId);
  }
}
