import axios from 'axios';
import { CallContext, CallResult, Prospect } from '../types';
import { CallAgent } from '../agents/call-agent';

/**
 * Voice Service
 *
 * Handles integration with voice AI platform (Vapi.ai in this implementation)
 * Manages call initiation, monitoring, and result processing.
 */
export class VoiceService {
  private apiKey: string;
  private baseURL: string;
  private callAgent: CallAgent;
  private activeCallMonitors: Map<string, NodeJS.Timeout>;

  constructor(callAgent: CallAgent) {
    this.apiKey = process.env.VAPI_API_KEY || '';
    this.baseURL = 'https://api.vapi.ai';
    this.callAgent = callAgent;
    this.activeCallMonitors = new Map();
  }

  /**
   * Initiate an outbound call
   */
  async initiateCall(
    prospect: Prospect,
    context: CallContext
  ): Promise<{ callId: string; status: string }> {
    console.log(`[VoiceService] Initiating call to ${prospect.name} at ${prospect.phone}`);

    try {
      // Step 1: Create dynamic assistant with prospect-specific context
      const assistant = await this.createAssistant(context);

      // Step 2: Start the call
      const response = await axios.post(
        `${this.baseURL}/call/phone`,
        {
          assistantId: assistant.id,
          customer: {
            number: prospect.phone,
            name: prospect.name,
          },
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          metadata: {
            prospect_id: prospect.id,
            campaign_id: context.campaign_id,
            account_manager_id: context.account_manager.id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const callId = response.data.id;

      // Step 3: Start monitoring the call
      this.startCallMonitoring(callId, prospect.id);

      return {
        callId,
        status: 'initiated',
      };
    } catch (error: any) {
      console.error('[VoiceService] Failed to initiate call:', error.response?.data || error);
      throw new Error(`Call initiation failed: ${error.message}`);
    }
  }

  /**
   * Create a dynamic assistant for this specific call
   */
  private async createAssistant(context: CallContext) {
    const systemPrompt = this.callAgent.buildSystemPrompt(context);
    const tools = this.callAgent.getToolsForAPI();

    try {
      const response = await axios.post(
        `${this.baseURL}/assistant`,
        {
          name: `Outbound Call - ${context.prospect_info.prospect.name}`,
          transcriber: {
            provider: 'deepgram',
            model: 'nova-2',
            language: 'en-US',
          },
          model: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
            ],
            functions: tools,
          },
          voice: {
            provider: 'openai',
            voiceId: 'alloy', // Natural, friendly female voice
            speed: 1.0,
          },
          firstMessage: `Hi, is this ${context.prospect_info.prospect.name}?`,
          recordingEnabled: true,
          endCallFunctionEnabled: true,
          silenceTimeoutSeconds: 30,
          maxDurationSeconds: 600, // 10 minute max call duration
          backgroundSound: 'office', // Subtle background for realism
          voicemailDetection: {
            enabled: true,
            voicemailMessage: `Hi ${context.prospect_info.prospect.name}, this is Katie from [Company]. I was hoping to connect about ${context.call_objective}. I'll send you a quick email as well, but feel free to reach me back at this number. Thanks!`,
          },
          endCallPhrases: [
            'talk to you later',
            'have a great day',
            'thanks for your time',
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[VoiceService] Failed to create assistant:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * Monitor call progress and handle real-time events
   */
  private startCallMonitoring(callId: string, prospectId: string) {
    console.log(`[VoiceService] Starting call monitoring for ${callId}`);

    // Poll call status every 5 seconds
    const monitor = setInterval(async () => {
      try {
        const callStatus = await this.getCallStatus(callId);

        if (callStatus.status === 'ended' || callStatus.status === 'failed') {
          console.log(`[VoiceService] Call ${callId} ended with status: ${callStatus.status}`);
          this.stopCallMonitoring(callId);

          // Process final call result
          if (callStatus.status === 'ended') {
            await this.processCallResult(callId, prospectId, callStatus);
          }
        } else {
          // Log real-time insights
          if (callStatus.transcript) {
            console.log(`[VoiceService] Call ${callId} - Latest transcript:`,
              callStatus.transcript.slice(-200)
            );
          }
        }
      } catch (error) {
        console.error(`[VoiceService] Error monitoring call ${callId}:`, error);
      }
    }, 5000);

    this.activeCallMonitors.set(callId, monitor);
  }

  /**
   * Stop monitoring a call
   */
  private stopCallMonitoring(callId: string) {
    const monitor = this.activeCallMonitors.get(callId);
    if (monitor) {
      clearInterval(monitor);
      this.activeCallMonitors.delete(callId);
    }
  }

  /**
   * Get current call status
   */
  async getCallStatus(callId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/call/${callId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`[VoiceService] Failed to get call status:`, error.response?.data || error);
      throw error;
    }
  }

  /**
   * Process final call result and generate structured output
   */
  private async processCallResult(
    callId: string,
    prospectId: string,
    callStatus: any
  ): Promise<CallResult> {
    console.log(`[VoiceService] Processing call result for ${callId}`);

    // Extract transcript
    const transcript = callStatus.transcript || '';

    // Analyze conversation state from metadata
    const conversationState = {
      stage: callStatus.endedReason === 'assistant-request' ? 'closing' : 'objection',
      turns: callStatus.messages?.length || 0,
      sentiment: this.analyzeSentiment(transcript),
      objections_raised: this.extractObjections(transcript),
    };

    // Get tool calls (function calls) made during conversation
    const toolCallsUsed = callStatus.messages
      ?.filter((m: any) => m.role === 'function_call')
      .map((m: any) => ({
        name: m.function_call.name,
        parameters: JSON.parse(m.function_call.arguments),
      })) || [];

    // Analyze outcome
    const result = this.callAgent.analyzeCallOutcome(
      transcript,
      conversationState as any,
      toolCallsUsed
    );

    // Complete result with call metadata
    const fullResult: CallResult = {
      ...result,
      call_id: callId,
      duration_seconds: callStatus.duration || 0,
    };

    console.log(`[VoiceService] Call result:`, {
      callId,
      outcome: fullResult.outcome,
      meetingBooked: fullResult.meeting_booked,
      sentiment: fullResult.sentiment_score,
    });

    return fullResult;
  }

  /**
   * Simple sentiment analysis based on keywords and tone
   */
  private analyzeSentiment(transcript: string): number {
    // This is a simple implementation - in production, use a proper sentiment model
    const positive = ['great', 'interested', 'yes', 'sounds good', 'perfect', 'excellent'];
    const negative = ['not interested', 'no thanks', 'busy', 'not now', 'remove', 'unsubscribe'];

    let score = 0.5; // Neutral baseline

    positive.forEach(word => {
      const matches = (transcript.toLowerCase().match(new RegExp(word, 'g')) || []).length;
      score += matches * 0.05;
    });

    negative.forEach(word => {
      const matches = (transcript.toLowerCase().match(new RegExp(word, 'g')) || []).length;
      score -= matches * 0.08;
    });

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract objections from transcript
   */
  private extractObjections(transcript: string): string[] {
    const objectionPatterns = [
      /not interested/i,
      /don't have time/i,
      /already have/i,
      /too expensive/i,
      /send me information/i,
      /call back later/i,
      /not the right time/i,
    ];

    const objections: string[] = [];
    objectionPatterns.forEach(pattern => {
      const match = transcript.match(pattern);
      if (match) {
        objections.push(match[0]);
      }
    });

    return objections;
  }

  /**
   * End a call manually
   */
  async endCall(callId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/call/${callId}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      this.stopCallMonitoring(callId);
      console.log(`[VoiceService] Call ${callId} ended manually`);
    } catch (error: any) {
      console.error(`[VoiceService] Failed to end call:`, error.response?.data || error);
      throw error;
    }
  }

  /**
   * Get call recording URL
   */
  async getRecordingUrl(callId: string): Promise<string | null> {
    try {
      const callData = await this.getCallStatus(callId);
      return callData.recordingUrl || null;
    } catch (error) {
      console.error(`[VoiceService] Failed to get recording URL:`, error);
      return null;
    }
  }

  /**
   * Cleanup - stop all active monitors
   */
  destroy() {
    this.activeCallMonitors.forEach((monitor, callId) => {
      this.stopCallMonitoring(callId);
    });
  }
}
