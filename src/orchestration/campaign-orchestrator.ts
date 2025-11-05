import Bull, { Queue, Job } from 'bull';
import { CampaignConfig, Prospect, CallContext, CallResult, ResearchContext } from '../types';
import { ResearchAgent } from '../agents/research-agent';
import { CallAgent } from '../agents/call-agent';
import { VoiceService } from '../services/voice-service';
import { CRMService } from '../services/crm-service';

/**
 * Campaign Orchestrator
 *
 * Manages end-to-end campaign execution:
 * 1. Load prospects from CRM
 * 2. Research and score each prospect
 * 3. Queue calls with optimal timing
 * 4. Monitor execution and handle retries
 * 5. Log results back to CRM
 */
export class CampaignOrchestrator {
  private callQueue: Queue;
  private researchAgent: ResearchAgent;
  private callAgent: CallAgent;
  private voiceService: VoiceService;
  private crmService: CRMService;

  constructor(
    researchAgent: ResearchAgent,
    callAgent: CallAgent,
    voiceService: VoiceService,
    crmService: CRMService
  ) {
    this.researchAgent = researchAgent;
    this.callAgent = callAgent;
    this.voiceService = voiceService;
    this.crmService = crmService;

    // Initialize Bull queue with Redis
    this.callQueue = new Bull('outbound-calls', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3600000, // 1 hour between retries
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: false, // Keep failed jobs for analysis
      },
    });

    this.setupQueueWorkers();
    this.setupQueueEvents();
  }

  /**
   * Launch a new outbound campaign
   */
  async launchCampaign(config: CampaignConfig): Promise<{
    campaign_id: string;
    total_prospects: number;
    queued_calls: number;
  }> {
    console.log(`[CampaignOrchestrator] Launching campaign: ${config.name}`);

    try {
      // Step 1: Load prospects from CRM based on filters
      const prospects = await this.loadProspects(config);
      console.log(`[CampaignOrchestrator] Loaded ${prospects.length} prospects`);

      // Step 2: Research agent - analyze all prospects in batch
      const enrichedProspects = await this.researchAgent.batchAnalyze(prospects);
      console.log(`[CampaignOrchestrator] Completed research for ${enrichedProspects.length} prospects`);

      // Step 3: Filter by success probability threshold
      const qualifiedProspects = enrichedProspects.filter(
        p => p.success_probability >= config.min_probability
      );
      console.log(
        `[CampaignOrchestrator] ${qualifiedProspects.length} prospects meet threshold (${config.min_probability}%)`
      );

      // Step 4: Sort by priority (success probability desc)
      qualifiedProspects.sort((a, b) => b.success_probability - a.success_probability);

      // Step 5: Queue calls with optimal timing and rate limiting
      let queuedCalls = 0;
      const callsPerDay = config.max_calls_per_day;
      const delayBetweenCalls = (24 * 60 * 60 * 1000) / callsPerDay; // ms between calls

      for (let i = 0; i < qualifiedProspects.length; i++) {
        const prospect = qualifiedProspects[i];

        // Calculate optimal call time
        const optimalTime = this.calculateOptimalCallTime(
          prospect.prospect.timezone,
          prospect.prospect.role,
          config.call_hours
        );

        // Add base delay for rate limiting
        const baseDelay = i * delayBetweenCalls;
        const totalDelay = baseDelay + (optimalTime.getTime() - Date.now());

        // Queue the call
        await this.callQueue.add(
          'make-call',
          {
            prospect: prospect.prospect,
            research_context: prospect,
            campaign_id: config.id,
            account_manager: await this.assignAccountManager(prospect),
          },
          {
            delay: Math.max(0, totalDelay),
            jobId: `call-${config.id}-${prospect.prospect.id}`,
            priority: Math.floor(prospect.success_probability), // Higher probability = higher priority
          }
        );

        queuedCalls++;
      }

      console.log(`[CampaignOrchestrator] Queued ${queuedCalls} calls for campaign ${config.id}`);

      return {
        campaign_id: config.id,
        total_prospects: prospects.length,
        queued_calls: queuedCalls,
      };
    } catch (error) {
      console.error('[CampaignOrchestrator] Campaign launch failed:', error);
      throw error;
    }
  }

  /**
   * Setup queue workers to process calls
   */
  private setupQueueWorkers() {
    // Process up to 5 calls concurrently (adjust based on voice API limits)
    this.callQueue.process('make-call', 5, async (job: Job) => {
      const { prospect, research_context, campaign_id, account_manager } = job.data;

      console.log(`[Worker] Processing call for ${prospect.name} (Job ${job.id})`);

      try {
        // Build call context
        const callContext: CallContext = {
          prospect_info: research_context,
          call_objective: 'book a discovery meeting',
          account_manager,
          conversation_state: {
            stage: 'opening',
            turns: 0,
            sentiment: 0.5,
            objections_raised: [],
          },
          campaign_id,
        };

        // Initiate the call
        const call = await this.voiceService.initiateCall(prospect, callContext);

        // Monitor until completion (with timeout)
        const result = await this.waitForCallCompletion(call.callId, 600000); // 10 min timeout

        // Log to CRM
        await this.logCallToCRM(prospect.id, campaign_id, result);

        // If meeting booked, handle post-booking tasks
        if (result.meeting_booked && result.meeting_details) {
          await this.handleMeetingBooked(result.meeting_details);
        }

        // Update job progress
        await job.progress(100);

        return result;
      } catch (error: any) {
        console.error(`[Worker] Call failed for ${prospect.name}:`, error);

        // Log failure to CRM
        await this.logCallFailure(prospect.id, campaign_id, error.message);

        throw error; // Bull will handle retry logic
      }
    });
  }

  /**
   * Setup queue event handlers for monitoring
   */
  private setupQueueEvents() {
    this.callQueue.on('completed', (job, result: CallResult) => {
      console.log(`[Queue] Call completed: ${job.id}`, {
        outcome: result.outcome,
        meeting_booked: result.meeting_booked,
      });
    });

    this.callQueue.on('failed', (job, error) => {
      console.error(`[Queue] Call failed: ${job.id}`, error.message);
    });

    this.callQueue.on('stalled', (job) => {
      console.warn(`[Queue] Call stalled: ${job.id}`);
    });

    this.callQueue.on('active', (job) => {
      console.log(`[Queue] Call started: ${job.id}`);
    });
  }

  /**
   * Wait for call completion with polling
   */
  private async waitForCallCompletion(
    callId: string,
    timeout: number
  ): Promise<CallResult> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeout) {
      const status = await this.voiceService.getCallStatus(callId);

      if (status.status === 'ended') {
        // Call completed - retrieve full result
        // In a real implementation, this would be stored by the voice service
        return {
          call_id: callId,
          status: 'completed',
          duration_seconds: status.duration || 0,
          transcript: status.transcript || '',
          sentiment_score: 0.5,
          outcome: status.endedReason === 'assistant-request' ? 'meeting_booked' : 'not_interested',
          meeting_booked: false,
        };
      }

      if (status.status === 'failed' || status.status === 'no-answer') {
        throw new Error(`Call ${status.status}`);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout reached
    throw new Error('Call timeout');
  }

  /**
   * Load prospects from CRM based on campaign filters
   */
  private async loadProspects(config: CampaignConfig): Promise<Prospect[]> {
    return await this.crmService.queryProspects(config.filters);
  }

  /**
   * Calculate optimal call time for a prospect
   */
  private calculateOptimalCallTime(
    timezone: string,
    role: string,
    callHours: { start: number; end: number }
  ): Date {
    // Best practice: Tuesday-Thursday, 10-11am or 4-5pm local time
    // Avoid: Mondays (busy), Fridays (checking out), lunch (12-1pm)

    const now = new Date();
    let candidateDate = new Date(now);

    // Find next valid day (Tue-Thu preferred)
    while (true) {
      const dayOfWeek = candidateDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        candidateDate.setDate(candidateDate.getDate() + 1);
        continue;
      }

      // Prefer Tue-Thu (2-4), but accept Mon/Fri if needed
      if (dayOfWeek >= 2 && dayOfWeek <= 4) {
        break;
      }

      // If we've checked a full week, settle for Mon/Fri
      if (candidateDate.getTime() - now.getTime() > 7 * 24 * 60 * 60 * 1000) {
        break;
      }

      candidateDate.setDate(candidateDate.getDate() + 1);
    }

    // Set optimal hour based on role
    let optimalHour: number;
    if (role.toLowerCase().includes('executive') || role.toLowerCase().includes('c-level')) {
      // Executives: early morning (8-9am) or late afternoon (4-5pm)
      optimalHour = Math.random() > 0.5 ? 8 : 16;
    } else if (role.toLowerCase().includes('manager')) {
      // Managers: mid-morning (10-11am)
      optimalHour = 10;
    } else {
      // Individual contributors: mid-afternoon (2-3pm)
      optimalHour = 14;
    }

    // Apply call hours constraint
    if (optimalHour < callHours.start) optimalHour = callHours.start;
    if (optimalHour > callHours.end) optimalHour = callHours.end;

    candidateDate.setHours(optimalHour, Math.floor(Math.random() * 60), 0, 0);

    // Convert from prospect's timezone to UTC
    // In production, use a proper timezone library like moment-timezone
    // For now, assuming timezone is a UTC offset
    return candidateDate;
  }

  /**
   * Assign appropriate account manager based on prospect attributes
   */
  private async assignAccountManager(prospect: ResearchContext) {
    // In production, this would query available account managers
    // and assign based on specialty, availability, territory, etc.
    return {
      id: 'am-001',
      name: 'John Smith',
      email: 'john.smith@company.com',
      specialty: 'Enterprise Sales',
      calendar_link: 'https://calendar.com/john-smith',
    };
  }

  /**
   * Log call result to CRM
   */
  private async logCallToCRM(
    prospectId: string,
    campaignId: string,
    result: CallResult
  ): Promise<void> {
    await this.crmService.logActivity({
      prospect_id: prospectId,
      campaign_id: campaignId,
      activity_type: 'call',
      outcome: result.outcome,
      duration_seconds: result.duration_seconds,
      transcript: result.transcript,
      sentiment_score: result.sentiment_score,
      meeting_booked: result.meeting_booked,
      recording_url: await this.voiceService.getRecordingUrl(result.call_id),
      timestamp: new Date(),
    });
  }

  /**
   * Log call failure to CRM
   */
  private async logCallFailure(
    prospectId: string,
    campaignId: string,
    errorMessage: string
  ): Promise<void> {
    await this.crmService.logActivity({
      prospect_id: prospectId,
      campaign_id: campaignId,
      activity_type: 'call_failed',
      outcome: 'failed',
      notes: errorMessage,
      timestamp: new Date(),
    });
  }

  /**
   * Handle post-booking tasks when meeting is booked
   */
  private async handleMeetingBooked(meetingDetails: any): Promise<void> {
    // 1. Send calendar invite
    console.log('[CampaignOrchestrator] Sending calendar invite...');

    // 2. Send confirmation email to prospect
    console.log('[CampaignOrchestrator] Sending confirmation email...');

    // 3. Send prep materials
    console.log('[CampaignOrchestrator] Sending prep materials...');

    // 4. Notify account manager
    console.log('[CampaignOrchestrator] Notifying account manager...');

    // 5. Update CRM opportunity stage
    await this.crmService.updateOpportunityStage(
      meetingDetails.prospect_id,
      'Meeting Scheduled'
    );
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string) {
    const [waiting, active, completed, failed] = await Promise.all([
      this.callQueue.getWaiting(),
      this.callQueue.getActive(),
      this.callQueue.getCompleted(),
      this.callQueue.getFailed(),
    ]);

    const campaignJobs = (jobs: Job[]) =>
      jobs.filter(j => j.data.campaign_id === campaignId);

    return {
      waiting: campaignJobs(waiting).length,
      active: campaignJobs(active).length,
      completed: campaignJobs(completed).length,
      failed: campaignJobs(failed).length,
    };
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await this.callQueue.pause();
    console.log(`[CampaignOrchestrator] Campaign ${campaignId} paused`);
  }

  /**
   * Resume a campaign
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    await this.callQueue.resume();
    console.log(`[CampaignOrchestrator] Campaign ${campaignId} resumed`);
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string): Promise<void> {
    const jobs = await this.callQueue.getJobs(['waiting', 'delayed']);
    const campaignJobs = jobs.filter(j => j.data.campaign_id === campaignId);

    for (const job of campaignJobs) {
      await job.remove();
    }

    console.log(`[CampaignOrchestrator] Campaign ${campaignId} cancelled, removed ${campaignJobs.length} jobs`);
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    await this.callQueue.close();
    this.voiceService.destroy();
  }
}
