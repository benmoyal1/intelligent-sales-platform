import { CallAgentService } from "../services/call-agent";

/**
 * Real Voice Service using Vapi.ai
 *
 * This makes ACTUAL phone calls using AI voice agents via direct API calls
 */
export class RealVoiceService {
  private apiKey: string;
  private callAgent: CallAgentService;

  constructor(callAgent: CallAgentService) {
    this.apiKey = process.env.VAPI_API_KEY || "";
    this.callAgent = callAgent;
  }

  /**
   * Make a real phone call to a prospect
   */
  async makeRealCall(
    phoneNumber: string,
    context: any,
    customInstructions?: string
  ): Promise<{
    callId: string;
    status: string;
  }> {
    console.log(`[RealVoiceService] Initiating call to ${phoneNumber}`);

    try {
      // Build system prompt from call context
      let systemPrompt = this.callAgent.buildSystemPrompt(context);

      // Add custom instructions if provided
      if (customInstructions) {
        systemPrompt += `\n\nCUSTOM INSTRUCTIONS FOR THIS CALL:\n${customInstructions}\n\nIMPORTANT: Follow these custom instructions carefully during the call.`;
        console.log(`[RealVoiceService] Including custom instructions in prompt`);
      }

      // Get prospect name from context (handle different structures)
      const prospectName = context.prospect_info?.prospect?.name || context.prospect_name || 'there';

      // Get webhook URL - use environment variable or fallback
      const webhookUrl = process.env.VAPI_WEBHOOK_URL || process.env.API_URL;

      console.log('[RealVoiceService] Using webhook URL:', webhookUrl);

      // Create assistant with dynamic context
      const assistantResponse = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Call to ${prospectName}`,
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.7,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
            ],
          },
          voice: {
            provider: "openai",
            voiceId: "echo", // Natural male voice for Ben Moyal
          },
          firstMessage: `Hi, this is Ben Moyal from Alta. Is this ${prospectName}?`,

          // Transcriber settings
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en",
          },

          // Webhook configuration - CRITICAL for conversation saving
          serverUrl: webhookUrl ? `${webhookUrl}/api/vapi/events` : undefined,
          serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'demo-secret',

          // Call behavior
          recordingEnabled: true,
          endCallFunctionEnabled: true,
          silenceTimeoutSeconds: 30,
          maxDurationSeconds: 60, // 1 minute max
        })
      });

      if (!assistantResponse.ok) {
        const error = await assistantResponse.text();
        throw new Error(`Failed to create assistant: ${assistantResponse.status} - ${error}`);
      }

      const assistant: any = await assistantResponse.json();

      // Make the actual phone call
      const callResponse = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantId: assistant.id,
          customer: {
            number: phoneNumber,
            name: prospectName,
          },
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        })
      });

      if (!callResponse.ok) {
        const error = await callResponse.text();
        throw new Error(`Failed to make call: ${callResponse.status} - ${error}`);
      }

      const call: any = await callResponse.json();

      console.log(`[RealVoiceService] Call initiated: ${call.id}`);

      return {
        callId: call.id,
        status: "initiated",
      };
    } catch (error: any) {
      console.error("[RealVoiceService] Error:", error);
      throw new Error(`Failed to initiate call: ${error.message}`);
    }
  }

  /**
   * Get call status and transcript
   */
  async getCallStatus(callId: string) {
    try {
      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get call status: ${response.status} - ${error}`);
      }

      const call: any = await response.json();

      return {
        status: call.status,
        duration: call.duration,
        transcript: call.transcript,
        recordingUrl: call.recordingUrl,
        endedReason: call.endedReason,
      };
    } catch (error) {
      console.error("[RealVoiceService] Error getting status:", error);
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callId: string) {
    try {
      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to end call: ${response.status} - ${error}`);
      }

      console.log(`[RealVoiceService] Call ${callId} ended`);
    } catch (error) {
      console.error("[RealVoiceService] Error ending call:", error);
      throw error;
    }
  }
}
