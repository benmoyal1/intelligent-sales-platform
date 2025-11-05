/**
 * Example Usage - AI-Driven Outbound Call Center System
 *
 * This file demonstrates how to use the multi-agent system to launch
 * and manage outbound calling campaigns.
 */

import { ResearchAgent } from './agents/research-agent';
import { CallAgent } from './agents/call-agent';
import { VoiceService } from './services/voice-service';
import { CRMService } from './services/crm-service';
import { EnrichmentService } from './services/enrichment-service';
import { SemanticContextService } from './services/semantic-context-service';
import { CampaignOrchestrator } from './orchestration/campaign-orchestrator';
import { CampaignConfig } from './types';

/**
 * Initialize all services and agents
 */
async function initializeSystem() {
  console.log('[System] Initializing AI-driven outbound call system...\n');

  // Initialize services
  const crmService = new CRMService('salesforce');
  const enrichmentService = new EnrichmentService();
  const contextService = new SemanticContextService();

  // Initialize agents
  const researchAgent = new ResearchAgent(
    crmService,
    enrichmentService,
    contextService
  );

  const callAgent = new CallAgent();
  const voiceService = new VoiceService(callAgent);

  // Initialize orchestrator
  const orchestrator = new CampaignOrchestrator(
    researchAgent,
    callAgent,
    voiceService,
    crmService
  );

  console.log('[System] ✓ All components initialized\n');

  return { orchestrator, researchAgent, callAgent, voiceService, crmService };
}

/**
 * Example 1: Launch a basic outbound campaign
 */
async function example1_BasicCampaign(orchestrator: CampaignOrchestrator) {
  console.log('='.repeat(60));
  console.log('EXAMPLE 1: Basic Outbound Campaign');
  console.log('='.repeat(60) + '\n');

  const campaignConfig: CampaignConfig = {
    id: 'campaign-q1-2025-tech',
    name: 'Q1 2025 - Enterprise Tech Outbound',
    filters: {
      industries: ['Technology', 'SaaS', 'Software'],
      company_size_min: 100,
      company_size_max: 1000,
      roles: ['VP of Sales', 'Director of Sales', 'Head of Revenue'],
      account_status: ['new', 'contacted'],
    },
    min_probability: 60, // Only call prospects with 60%+ success probability
    max_calls_per_day: 50,
    call_hours: {
      start: 9,  // 9am UTC
      end: 17,   // 5pm UTC
    },
  };

  console.log('Campaign Configuration:');
  console.log(JSON.stringify(campaignConfig, null, 2));
  console.log('\n');

  try {
    const result = await orchestrator.launchCampaign(campaignConfig);

    console.log('\n✓ Campaign launched successfully!\n');
    console.log('Results:');
    console.log(`- Total prospects loaded: ${result.total_prospects}`);
    console.log(`- Qualified calls queued: ${result.queued_calls}`);
    console.log(`- Campaign ID: ${result.campaign_id}\n`);

    // Monitor campaign progress
    console.log('Monitoring campaign (first 30 seconds)...\n');

    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const stats = await orchestrator.getCampaignStats(campaignConfig.id);
      console.log(`[T+${(i + 1) * 5}s] Status:`, {
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
      });
    }
  } catch (error) {
    console.error('Campaign launch failed:', error);
  }

  console.log('\n');
}

/**
 * Example 2: Research a single prospect
 */
async function example2_ResearchProspect(researchAgent: ResearchAgent) {
  console.log('='.repeat(60));
  console.log('EXAMPLE 2: Research Single Prospect');
  console.log('='.repeat(60) + '\n');

  const prospect = {
    id: 'prospect-demo-001',
    crm_id: 'sf-00123',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-555-0123',
    company: 'TechCorp Solutions',
    role: 'VP of Sales',
    timezone: 'America/New_York',
    linkedin_url: 'https://linkedin.com/in/sarahjohnson',
  };

  console.log('Prospect:', prospect.name);
  console.log('Company:', prospect.company);
  console.log('Role:', prospect.role);
  console.log('\nAnalyzing...\n');

  try {
    const analysis = await researchAgent.analyze(prospect);

    console.log('✓ Research complete!\n');
    console.log('Key Talking Points:');
    analysis.talking_points.forEach((point, idx) => {
      console.log(`  ${idx + 1}. ${point}`);
    });

    console.log('\nPain Points:');
    analysis.pain_points.forEach((point, idx) => {
      console.log(`  ${idx + 1}. ${point}`);
    });

    console.log('\nApproach Strategy:', analysis.approach_strategy);
    console.log('Success Probability:', `${analysis.success_probability}%`);

    console.log('\nObjection Handling Strategies:');
    Object.entries(analysis.objection_strategies).forEach(([objection, strategy]) => {
      console.log(`  Objection: "${objection}"`);
      console.log(`  Strategy: ${strategy}\n`);
    });
  } catch (error) {
    console.error('Research failed:', error);
  }

  console.log('\n');
}

/**
 * Example 3: Make a single test call
 */
async function example3_TestCall(
  researchAgent: ResearchAgent,
  voiceService: VoiceService
) {
  console.log('='.repeat(60));
  console.log('EXAMPLE 3: Test Call');
  console.log('='.repeat(60) + '\n');

  const prospect = {
    id: 'prospect-test-001',
    crm_id: 'sf-test-001',
    name: 'Test Prospect',
    email: 'test@example.com',
    phone: process.env.TEST_PHONE_NUMBER || '+1-555-9999',
    company: 'Test Company',
    role: 'VP of Sales',
    timezone: 'America/Los_Angeles',
  };

  console.log('WARNING: This will make a real phone call!');
  console.log(`Calling: ${prospect.phone}`);
  console.log('\nPreparing call context...\n');

  try {
    // Step 1: Research
    const research = await researchAgent.analyze(prospect);
    console.log('✓ Research complete');
    console.log(`  Success Probability: ${research.success_probability}%\n`);

    // Step 2: Build call context
    const callContext = {
      prospect_info: research,
      call_objective: 'book a discovery meeting',
      account_manager: {
        id: 'am-001',
        name: 'John Smith',
        email: 'john.smith@company.com',
        specialty: 'Enterprise Sales',
        calendar_link: 'https://calendar.com/john-smith',
      },
      conversation_state: {
        stage: 'opening' as const,
        turns: 0,
        sentiment: 0.5,
        objections_raised: [],
      },
      campaign_id: 'test-campaign',
    };

    // Step 3: Initiate call
    console.log('Initiating call...\n');
    const call = await voiceService.initiateCall(prospect, callContext);

    console.log('✓ Call initiated!');
    console.log(`  Call ID: ${call.callId}`);
    console.log(`  Status: ${call.status}\n`);

    // Step 4: Monitor call
    console.log('Monitoring call (will poll for 2 minutes)...\n');

    for (let i = 0; i < 24; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const status = await voiceService.getCallStatus(call.callId);
      console.log(`[T+${(i + 1) * 5}s] Status: ${status.status}`);

      if (status.status === 'ended' || status.status === 'failed') {
        console.log('\n✓ Call completed!');
        console.log(`  Duration: ${status.duration}s`);
        console.log(`  Outcome: ${status.endedReason}\n`);

        if (status.transcript) {
          console.log('Transcript (first 500 chars):');
          console.log(status.transcript.substring(0, 500));
          console.log('...\n');
        }
        break;
      }
    }
  } catch (error) {
    console.error('Test call failed:', error);
  }

  console.log('\n');
}

/**
 * Example 4: Campaign management operations
 */
async function example4_CampaignManagement(orchestrator: CampaignOrchestrator) {
  console.log('='.repeat(60));
  console.log('EXAMPLE 4: Campaign Management');
  console.log('='.repeat(60) + '\n');

  const campaignId = 'campaign-management-demo';

  // Launch a campaign
  console.log('Launching campaign...');
  await orchestrator.launchCampaign({
    id: campaignId,
    name: 'Management Demo Campaign',
    filters: {
      industries: ['Technology'],
      company_size_min: 50,
    },
    min_probability: 50,
    max_calls_per_day: 20,
    call_hours: { start: 9, end: 17 },
  });
  console.log('✓ Campaign launched\n');

  // Get stats
  console.log('Getting campaign statistics...');
  const stats = await orchestrator.getCampaignStats(campaignId);
  console.log('Stats:', stats);
  console.log('');

  // Pause campaign
  console.log('Pausing campaign...');
  await orchestrator.pauseCampaign(campaignId);
  console.log('✓ Campaign paused\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Resume campaign
  console.log('Resuming campaign...');
  await orchestrator.resumeCampaign(campaignId);
  console.log('✓ Campaign resumed\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Cancel campaign
  console.log('Cancelling campaign...');
  await orchestrator.cancelCampaign(campaignId);
  console.log('✓ Campaign cancelled\n');

  console.log('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(8) + 'AI-DRIVEN OUTBOUND CALL CENTER SYSTEM' + ' '.repeat(11) + '║');
  console.log('║' + ' '.repeat(18) + 'Example Usage Scenarios' + ' '.repeat(17) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('\n');

  try {
    // Initialize system
    const { orchestrator, researchAgent, callAgent, voiceService, crmService } =
      await initializeSystem();

    // Run examples (comment out examples you don't want to run)

    // Example 1: Basic campaign launch
    await example1_BasicCampaign(orchestrator);

    // Example 2: Research a single prospect
    await example2_ResearchProspect(researchAgent);

    // Example 3: Make a test call (WARNING: Makes real phone call!)
    // Uncomment only if you want to test actual calling
    // await example3_TestCall(researchAgent, voiceService);

    // Example 4: Campaign management operations
    await example4_CampaignManagement(orchestrator);

    console.log('='.repeat(60));
    console.log('All examples completed!');
    console.log('='.repeat(60) + '\n');

    // Cleanup
    await orchestrator.destroy();
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main, initializeSystem };
