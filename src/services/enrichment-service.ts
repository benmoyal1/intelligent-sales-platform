import { Prospect, EnrichmentData } from '../types';
import axios from 'axios';

/**
 * Enrichment Service
 *
 * Enriches prospect data with external sources (LinkedIn, company databases, news, etc.)
 * Uses services like Apollo, Clearbit, or similar
 */
export class EnrichmentService {
  private apolloApiKey: string;

  constructor() {
    this.apolloApiKey = process.env.APOLLO_API_KEY || '';
  }

  /**
   * Enrich prospect with external data
   */
  async enrichProspect(prospect: Prospect): Promise<EnrichmentData> {
    console.log(`[EnrichmentService] Enriching prospect: ${prospect.name}`);

    // In production: Call multiple enrichment APIs in parallel
    const [companyData, newsData] = await Promise.all([
      this.getCompanyData(prospect.company),
      this.getCompanyNews(prospect.company),
    ]);

    return {
      company_size: companyData.employee_count || 100,
      recent_news: newsData,
      funding_stage: companyData.funding_stage || 'Unknown',
      tech_stack: companyData.technologies || [],
      employee_growth_rate: companyData.employee_growth_rate,
      revenue_estimate: companyData.revenue_estimate,
    };
  }

  /**
   * Get company data from Apollo or similar
   */
  private async getCompanyData(companyName: string): Promise<any> {
    // Stub implementation
    // In production: Use Apollo API
    /*
    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/organizations/enrich',
        { name: companyName },
        {
          headers: {
            'X-Api-Key': this.apolloApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        employee_count: response.data.organization.estimated_num_employees,
        funding_stage: response.data.organization.funding_stage,
        revenue_estimate: response.data.organization.estimated_annual_revenue,
        technologies: response.data.organization.technologies,
        employee_growth_rate: response.data.organization.employee_growth_rate,
      };
    } catch (error) {
      console.error('[EnrichmentService] Apollo API error:', error);
      return this.getFallbackData();
    }
    */

    // Mock data for demonstration
    return {
      employee_count: 250,
      funding_stage: 'Series B',
      revenue_estimate: '$10M - $50M',
      technologies: ['Salesforce', 'HubSpot', 'Slack', 'Zoom'],
      employee_growth_rate: 25,
    };
  }

  /**
   * Get recent company news
   */
  private async getCompanyNews(companyName: string): Promise<string[]> {
    // Stub implementation
    // In production: Use News API or similar

    /*
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: companyName,
          sortBy: 'publishedAt',
          pageSize: 5,
          apiKey: process.env.NEWS_API_KEY,
        },
      });

      return response.data.articles.map((article: any) => article.title);
    } catch (error) {
      console.error('[EnrichmentService] News API error:', error);
      return [];
    }
    */

    // Mock data
    return [
      `${companyName} announces new product launch`,
      `${companyName} expands to new market`,
      `${companyName} secures $20M in Series B funding`,
    ];
  }

  /**
   * Get contact-specific enrichment data
   */
  async enrichContact(prospect: Prospect): Promise<any> {
    // Get LinkedIn profile data, job history, etc.
    console.log(`[EnrichmentService] Enriching contact: ${prospect.name}`);

    // In production: Use LinkedIn Sales Navigator API or similar
    return {
      linkedin_profile: {
        connections: 500,
        recent_posts: [],
        job_tenure_months: 18,
        previous_companies: ['Previous Corp', 'Startup Inc'],
      },
    };
  }

  /**
   * Batch enrich multiple prospects
   */
  async batchEnrich(prospects: Prospect[]): Promise<Map<string, EnrichmentData>> {
    console.log(`[EnrichmentService] Batch enriching ${prospects.length} prospects`);

    const results = new Map<string, EnrichmentData>();

    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (p) => {
          try {
            const enriched = await this.enrichProspect(p);
            return { id: p.id, data: enriched };
          } catch (error) {
            console.error(`Failed to enrich ${p.name}:`, error);
            return { id: p.id, data: null };
          }
        })
      );

      batchResults.forEach(({ id, data }) => {
        if (data) results.set(id, data);
      });

      // Rate limiting delay
      if (i + batchSize < prospects.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
