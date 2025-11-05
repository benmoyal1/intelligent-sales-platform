import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { VectorMetadata } from '../types';

/**
 * Semantic Context Service
 *
 * Manages the semantic context layer (GTM Brain) that unifies structured and
 * unstructured data using vector embeddings for intelligent retrieval.
 */
export class SemanticContextService {
  private pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small', // Cost-effective embeddings
    });

    this.indexName = process.env.PINECONE_INDEX_NAME || 'outbound-context';
  }

  /**
   * Get historical context for a prospect using semantic search
   */
  async getHistoricalContext(prospectId: string): Promise<string> {
    console.log(`[SemanticContextService] Retrieving historical context for ${prospectId}`);

    try {
      const index = this.pinecone.index(this.indexName);

      // Query for relevant past interactions
      const queryEmbedding = await this.embeddings.embedQuery(
        `Historical interactions and context for prospect ${prospectId}`
      );

      const results = await index.query({
        vector: queryEmbedding,
        topK: 5,
        filter: { prospect_id: prospectId },
        includeMetadata: true,
      });

      if (!results.matches || results.matches.length === 0) {
        return 'No previous context available';
      }

      // Combine and format results
      const contextPieces = results.matches.map((match, idx) => {
        const metadata = match.metadata as VectorMetadata;
        const timestamp = new Date(metadata.timestamp).toLocaleDateString();

        return `${idx + 1}. ${metadata.type} (${timestamp}):
${match.metadata?.content || 'No content available'}
Outcome: ${metadata.outcome || 'Unknown'}
Topics: ${metadata.topics?.join(', ') || 'None'}`;
      });

      return contextPieces.join('\n\n');
    } catch (error) {
      console.error('[SemanticContextService] Error retrieving context:', error);
      return 'Error retrieving historical context';
    }
  }

  /**
   * Store a new interaction in the semantic context layer
   */
  async storeInteraction(
    prospectId: string,
    content: string,
    metadata: Omit<VectorMetadata, 'prospect_id'>
  ): Promise<void> {
    console.log(`[SemanticContextService] Storing interaction for ${prospectId}`);

    try {
      const index = this.pinecone.index(this.indexName);

      // Generate embedding
      const embedding = await this.embeddings.embedQuery(content);

      // Create vector with metadata
      const vector = {
        id: `${prospectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        values: embedding,
        metadata: {
          ...metadata,
          prospect_id: prospectId,
          content: content.substring(0, 1000), // Limit stored content
        },
      };

      // Upsert to Pinecone
      await index.upsert([vector]);

      console.log('[SemanticContextService] Interaction stored successfully');
    } catch (error) {
      console.error('[SemanticContextService] Error storing interaction:', error);
      throw error;
    }
  }

  /**
   * Store call transcript
   */
  async storeCallTranscript(
    prospectId: string,
    callId: string,
    transcript: string,
    outcome: string,
    sentiment: number
  ): Promise<void> {
    // Extract key topics from transcript (simple keyword extraction)
    const topics = this.extractTopics(transcript);

    await this.storeInteraction(prospectId, transcript, {
      type: 'call_transcript',
      timestamp: new Date().toISOString(),
      outcome,
      sentiment,
      topics,
    });
  }

  /**
   * Store email interaction
   */
  async storeEmailInteraction(
    prospectId: string,
    emailContent: string,
    outcome?: string
  ): Promise<void> {
    const topics = this.extractTopics(emailContent);

    await this.storeInteraction(prospectId, emailContent, {
      type: 'email',
      timestamp: new Date().toISOString(),
      outcome,
      topics,
    });
  }

  /**
   * Store meeting notes
   */
  async storeMeetingNotes(
    prospectId: string,
    notes: string,
    outcome: string
  ): Promise<void> {
    const topics = this.extractTopics(notes);

    await this.storeInteraction(prospectId, notes, {
      type: 'meeting_notes',
      timestamp: new Date().toISOString(),
      outcome,
      topics,
    });
  }

  /**
   * Search across all prospects for similar interactions
   */
  async searchSimilarInteractions(query: string, topK: number = 10): Promise<any[]> {
    console.log(`[SemanticContextService] Searching for: ${query}`);

    try {
      const index = this.pinecone.index(this.indexName);
      const queryEmbedding = await this.embeddings.embedQuery(query);

      const results = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });

      return results.matches || [];
    } catch (error) {
      console.error('[SemanticContextService] Search error:', error);
      return [];
    }
  }

  /**
   * Get aggregated insights for a prospect
   */
  async getProspectInsights(prospectId: string): Promise<{
    total_interactions: number;
    avg_sentiment: number;
    common_topics: string[];
    last_interaction_date: Date | null;
  }> {
    console.log(`[SemanticContextService] Getting insights for ${prospectId}`);

    try {
      const index = this.pinecone.index(this.indexName);

      // This would require fetching all vectors for the prospect
      // For now, return stub data
      // In production: Use Pinecone's metadata filtering + stats

      return {
        total_interactions: 5,
        avg_sentiment: 0.65,
        common_topics: ['pricing', 'features', 'integration'],
        last_interaction_date: new Date(),
      };
    } catch (error) {
      console.error('[SemanticContextService] Error getting insights:', error);
      return {
        total_interactions: 0,
        avg_sentiment: 0.5,
        common_topics: [],
        last_interaction_date: null,
      };
    }
  }

  /**
   * Simple topic extraction from text
   */
  private extractTopics(text: string): string[] {
    // Simple keyword extraction - in production, use proper NLP
    const keywords = [
      'pricing', 'cost', 'budget',
      'features', 'functionality',
      'integration', 'api',
      'security', 'compliance',
      'support', 'training',
      'timeline', 'deadline',
      'meeting', 'demo', 'trial',
    ];

    const lowerText = text.toLowerCase();
    const foundTopics = keywords.filter(keyword =>
      lowerText.includes(keyword)
    );

    return [...new Set(foundTopics)]; // Remove duplicates
  }

  /**
   * Delete all data for a prospect (GDPR compliance)
   */
  async deleteProspectData(prospectId: string): Promise<void> {
    console.log(`[SemanticContextService] Deleting data for ${prospectId}`);

    try {
      const index = this.pinecone.index(this.indexName);

      // Delete all vectors with this prospect_id
      // In production: Use deleteMany with filter
      await index.deleteMany({ prospect_id: prospectId });

      console.log('[SemanticContextService] Data deleted successfully');
    } catch (error) {
      console.error('[SemanticContextService] Error deleting data:', error);
      throw error;
    }
  }
}
