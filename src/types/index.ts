// Core domain types for the outbound AI system

export interface Prospect {
  id: string;
  crm_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  timezone: string;
  linkedin_url?: string;
}

export interface CRMData {
  account_status: 'new' | 'contacted' | 'qualified' | 'unqualified';
  past_interactions: Interaction[];
  deal_value?: number;
  industry: string;
  company_size?: number;
  last_contact_date?: Date;
}

export interface Interaction {
  id: string;
  type: 'call' | 'email' | 'meeting';
  date: Date;
  summary: string;
  outcome?: string;
  sentiment?: number;
}

export interface EnrichmentData {
  company_size: number;
  recent_news: string[];
  funding_stage: string;
  tech_stack: string[];
  employee_growth_rate?: number;
  revenue_estimate?: string;
}

export interface ResearchContext {
  prospect: Prospect;
  crm_data: CRMData;
  enrichment_data: EnrichmentData;
  talking_points: string[];
  pain_points: string[];
  approach_strategy: 'consultative' | 'direct' | 'educational';
  objection_strategies: Record<string, string>;
  success_probability: number;
}

export interface CallContext {
  prospect_info: ResearchContext;
  call_objective: string;
  account_manager: AccountManager;
  conversation_state: ConversationState;
  campaign_id: string;
}

export interface AccountManager {
  id: string;
  name: string;
  email: string;
  specialty: string;
  calendar_link: string;
  available_slots?: TimeSlot[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  timezone: string;
}

export interface ConversationState {
  stage: 'opening' | 'discovery' | 'qualification' | 'booking' | 'objection' | 'closing';
  turns: number;
  sentiment: number;
  objections_raised: string[];
  qualification_data?: QualificationData;
}

export interface QualificationData {
  budget_confirmed: boolean;
  authority_confirmed: boolean;
  need_identified: boolean;
  timeline_discussed: boolean;
  bant_score: number; // 0-100
}

export interface CallResult {
  call_id: string;
  status: 'completed' | 'failed' | 'no-answer' | 'voicemail';
  duration_seconds: number;
  transcript: string;
  sentiment_score: number;
  outcome: 'meeting_booked' | 'follow_up' | 'not_interested' | 'callback';
  meeting_booked: boolean;
  meeting_details?: MeetingDetails;
  next_action?: string;
}

export interface MeetingDetails {
  datetime: Date;
  duration_minutes: number;
  meeting_type: string;
  account_manager_id: string;
  prospect_email: string;
  zoom_link?: string;
}

export interface CampaignConfig {
  id: string;
  name: string;
  filters: ProspectFilters;
  min_probability: number;
  max_calls_per_day: number;
  call_hours: {
    start: number; // hour in UTC
    end: number;
  };
  script_template?: string;
  target_completion_date?: Date;
}

export interface ProspectFilters {
  industries?: string[];
  company_size_min?: number;
  company_size_max?: number;
  roles?: string[];
  account_status?: string[];
  custom_query?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

export interface ConversationMemory {
  short_term: {
    current_call_transcript: string;
    detected_objections: string[];
    key_points_mentioned: string[];
    sentiment_timeline: number[];
  };
  long_term: {
    prospect_id: string;
    all_past_calls: CallResult[];
    email_thread_summaries: string[];
    meeting_history: MeetingDetails[];
  };
  working_memory: {
    current_goal: string;
    next_best_action: string;
    confidence_score: number;
  };
}

export interface VectorMetadata {
  prospect_id: string;
  type: 'call_transcript' | 'email' | 'meeting_notes' | 'crm_notes';
  timestamp: string;
  outcome?: string;
  sentiment?: number;
  topics: string[];
}
