import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import {
  Prospect,
  ResearchContext,
  CRMData,
  EnrichmentData,
} from '../types';
import { CRMService } from '../services/crm-service';
import { EnrichmentService } from '../services/enrichment-service';
import { SemanticContextService } from '../services/semantic-context-service';

/**
 * Research Agent
 *
 * Responsible for gathering and analyzing all available context about a prospect
 * before making an outbound call. Combines structured CRM data with unstructured
 * signals (emails, past calls, notes) and external enrichment data.
 */
export class ResearchAgent {
  private llm: ChatOpenAI;
  private crmService: CRMService;
  private enrichmentService: EnrichmentService;
  private contextService: SemanticContextService;

  constructor(
    crmService: CRMService,
    enrichmentService: EnrichmentService,
    contextService: SemanticContextService
  ) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.3, // Lower temperature for more consistent research output
    });
    this.crmService = crmService;
    this.enrichmentService = enrichmentService;
    this.contextService = contextService;
  }

  /**
   * Main entry point: analyze a prospect and generate comprehensive research context
   */
  async analyze(prospect: Prospect): Promise<ResearchContext> {
    console.log(`[ResearchAgent] Analyzing prospect: ${prospect.name}`);

    // Step 1: Gather all data sources in parallel
    const [crmData, enrichmentData, historicalContext] = await Promise.all([
      this.crmService.fetchProspectData(prospect.crm_id),
      this.enrichmentService.enrichProspect(prospect),
      this.contextService.getHistoricalContext(prospect.id),
    ]);

    // Step 2: Use LLM to synthesize insights
    const analysis = await this.synthesizeInsights({
      prospect,
      crmData,
      enrichmentData,
      historicalContext,
    });

    // Step 3: Calculate success probability
    const successProbability = this.calculateSuccessProbability(
      crmData,
      enrichmentData,
      analysis
    );

    return {
      prospect,
      crm_data: crmData,
      enrichment_data: enrichmentData,
      talking_points: analysis.talking_points,
      pain_points: analysis.pain_points,
      approach_strategy: analysis.approach_strategy,
      objection_strategies: analysis.objection_strategies,
      success_probability: successProbability,
    };
  }

  /**
   * Use LLM to synthesize insights from all data sources
   */
  private async synthesizeInsights(data: {
    prospect: Prospect;
    crmData: CRMData;
    enrichmentData: EnrichmentData;
    historicalContext: string;
  }) {
    // Define structured output schema
    const outputSchema = z.object({
      talking_points: z
        .array(z.string())
        .describe('3-5 key talking points tailored to this prospect'),
      pain_points: z
        .array(z.string())
        .describe('Likely pain points based on role, industry, company stage'),
      approach_strategy: z
        .enum(['consultative', 'direct', 'educational'])
        .describe('Best approach strategy for this prospect'),
      objection_strategies: z
        .record(z.string())
        .describe('Map of likely objections to handling strategies'),
      reasoning: z.string().describe('Brief reasoning for recommendations'),
    });

    const parser = StructuredOutputParser.fromZodSchema(outputSchema);

    const prompt = PromptTemplate.fromTemplate(`
You are a research agent preparing for an outbound sales call. Analyze the prospect data and provide strategic recommendations.

PROSPECT INFO:
Name: {prospect_name}
Role: {prospect_role}
Company: {prospect_company}
Industry: {industry}

CRM DATA:
Account Status: {account_status}
Past Interactions: {past_interactions}
Deal Value: {deal_value}

ENRICHMENT DATA:
Company Size: {company_size} employees
Recent News: {recent_news}
Funding Stage: {funding_stage}
Tech Stack: {tech_stack}

HISTORICAL CONTEXT:
{historical_context}

TASK:
Based on this data, provide:
1. Key talking points that will resonate with this prospect
2. Likely pain points they're experiencing
3. Best approach strategy (consultative, direct, or educational)
4. Strategies for handling likely objections

Be specific and actionable. Consider their role, company stage, and past interactions.

{format_instructions}
`);

    const input = await prompt.format({
      prospect_name: data.prospect.name,
      prospect_role: data.prospect.role,
      prospect_company: data.prospect.company,
      industry: data.crmData.industry,
      account_status: data.crmData.account_status,
      past_interactions: this.summarizeInteractions(data.crmData.past_interactions),
      deal_value: data.crmData.deal_value || 'Unknown',
      company_size: data.enrichmentData.company_size,
      recent_news: data.enrichmentData.recent_news.slice(0, 3).join('; '),
      funding_stage: data.enrichmentData.funding_stage,
      tech_stack: data.enrichmentData.tech_stack.join(', '),
      historical_context: data.historicalContext || 'No previous context available',
      format_instructions: parser.getFormatInstructions(),
    });

    const response = await this.llm.invoke(input);
    const parsed = await parser.parse(response.content as string);

    return parsed;
  }

  /**
   * Calculate success probability based on multiple factors
   */
  private calculateSuccessProbability(
    crmData: CRMData,
    enrichmentData: EnrichmentData,
    analysis: any
  ): number {
    let score = 50; // Base score

    // Account status factor
    if (crmData.account_status === 'qualified') score += 20;
    if (crmData.account_status === 'contacted') score += 10;
    if (crmData.account_status === 'unqualified') score -= 30;

    // Past interactions factor
    const positiveInteractions = crmData.past_interactions.filter(
      i => i.sentiment && i.sentiment > 0.5
    ).length;
    score += positiveInteractions * 5;

    const recentInteraction = crmData.past_interactions.find(
      i => {
        const daysSince = (Date.now() - i.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 30;
      }
    );
    if (recentInteraction && recentInteraction.sentiment && recentInteraction.sentiment > 0.6) {
      score += 15;
    }

    // Company signals factor
    if (enrichmentData.funding_stage.includes('Series') || enrichmentData.funding_stage.includes('Growth')) {
      score += 10; // Funded companies more likely to buy
    }
    if (enrichmentData.employee_growth_rate && enrichmentData.employee_growth_rate > 20) {
      score += 10; // Growing companies need solutions
    }

    // Deal value factor
    if (crmData.deal_value && crmData.deal_value > 50000) {
      score += 10; // High-value deals get priority
    }

    // Approach strategy alignment
    if (analysis.approach_strategy === 'consultative' && crmData.account_status === 'contacted') {
      score += 5; // Good match
    }

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Helper to summarize past interactions
   */
  private summarizeInteractions(interactions: any[]): string {
    if (!interactions || interactions.length === 0) {
      return 'No past interactions';
    }

    return interactions
      .slice(0, 5) // Last 5 interactions
      .map(i => `${i.type} on ${i.date.toLocaleDateString()}: ${i.summary}`)
      .join('\n');
  }

  /**
   * Batch analyze multiple prospects (for campaign preparation)
   */
  async batchAnalyze(prospects: Prospect[]): Promise<ResearchContext[]> {
    console.log(`[ResearchAgent] Batch analyzing ${prospects.length} prospects`);

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    const results: ResearchContext[] = [];

    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(p => this.analyze(p).catch(error => {
          console.error(`Failed to analyze ${p.name}:`, error);
          return null;
        }))
      );

      results.push(...batchResults.filter(r => r !== null) as ResearchContext[]);

      // Small delay between batches
      if (i + batchSize < prospects.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
