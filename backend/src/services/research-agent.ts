import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ProspectInput {
  name: string;
  company: string;
  role: string;
  industry: string;
  company_size: number;
}

export interface ResearchResult {
  talking_points: string[];
  pain_points: string[];
  approach_strategy: 'consultative' | 'direct' | 'educational';
  objection_strategies: Record<string, string>;
  success_probability: number;
  reasoning: string;
}

export class ResearchAgentService {
  async analyzeProspect(prospect: ProspectInput): Promise<ResearchResult> {
    console.log(`[ResearchAgent] Analyzing ${prospect.name} at ${prospect.company}`);

    const prompt = `You are a research agent preparing for an outbound sales call.

PROSPECT INFO:
Name: ${prospect.name}
Role: ${prospect.role}
Company: ${prospect.company}
Industry: ${prospect.industry}
Company Size: ${prospect.company_size} employees

TASK:
Analyze this prospect and provide strategic recommendations for the sales call.

Respond with a JSON object containing:
{
  "talking_points": ["3-5 specific talking points tailored to their role and industry"],
  "pain_points": ["3-4 likely pain points based on their company size and industry"],
  "approach_strategy": "consultative | direct | educational",
  "objection_strategies": {
    "not_interested": "strategy to handle this objection",
    "too_busy": "strategy to handle this objection",
    "already_have_solution": "strategy to handle this objection"
  },
  "success_probability": 75,
  "reasoning": "Brief explanation of why this approach and probability"
}

Be specific and actionable. Consider their role, company stage, and industry.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using mini to save costs
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales research analyst. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      console.log(`[ResearchAgent] Analysis complete for ${prospect.name}`);

      return result;
    } catch (error) {
      console.error('[ResearchAgent] Error:', error);
      // Return fallback data if API fails
      return this.getFallbackResearch(prospect);
    }
  }

  private getFallbackResearch(prospect: ProspectInput): ResearchResult {
    return {
      talking_points: [
        `Reach out about challenges ${prospect.role}s face in ${prospect.industry}`,
        `Discuss how companies of ${prospect.company_size} employees can scale efficiently`,
        `Share relevant case studies from similar companies`,
      ],
      pain_points: [
        'Manual processes taking too much time',
        'Difficulty scaling operations',
        'Need for better data insights',
      ],
      approach_strategy: 'consultative',
      objection_strategies: {
        not_interested: 'Acknowledge and ask if there\'s a better time, offer to send relevant case study',
        too_busy: 'Respect their time, offer 15-min meeting at their convenience',
        already_have_solution: 'Ask what they like about current solution, find gaps',
      },
      success_probability: 60,
      reasoning: 'Fallback research due to API unavailability',
    };
  }
}
