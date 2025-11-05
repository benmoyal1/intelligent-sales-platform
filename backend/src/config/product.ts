/**
 * Alta Product Configuration
 *
 * This defines what product the AI agent will be selling
 */

export const ALTA_PRODUCT = {
  name: "Alta AI Sales Platform",
  company: "Alta",
  description:
    "AI-powered sales automation platform that helps B2B companies 3x their outbound meeting bookings",

  keyFeatures: [
    "AI-powered research agent that analyzes prospects in seconds",
    "Smart conversation AI that adapts to prospect responses",
    "Automated meeting booking and calendar integration",
    "Multi-channel outreach (voice, email, WhatsApp)",
    "Real-time sentiment analysis and qualification",
  ],

  valueProposition: {
    primary: "Book 3x more meetings while reducing sales team workload by 70%",
    secondary:
      "AI agents work 24/7, never miss a follow-up, and scale infinitely",
  },

  pricing: {
    starter: "$499/month for up to 500 prospects",
    growth: "$1,499/month for up to 2,000 prospects",
    enterprise: "Custom pricing for unlimited scale",
  },

  idealCustomer: {
    companySize: "50-500 employees",
    industries: ["SaaS", "Technology", "B2B Services", "Financial Services"],
    roles: [
      "VP of Sales",
      "Director of Sales",
      "CRO",
      "Head of Revenue Operations",
    ],
    painPoints: [
      "Low connect rates on outbound calls",
      "Sales team spending too much time on manual outreach",
      "Inconsistent messaging across the team",
      "Difficulty scaling outbound efforts",
      "Poor lead qualification",
    ],
  },

  competitiveAdvantages: [
    "True conversational AI (not scripted bots)",
    "Built-in research capabilities",
    "Multi-agent architecture for complex workflows",
    "Israeli innovation with global reach",
  ],

  testimonial: {
    company: "TechCorp",
    quote:
      "Alta helped us increase our meeting booking rate from 8% to 24% in just 2 months",
    role: "VP of Sales",
  },
};

export function getProductPitch(prospect: any): string {
  const { name, company, role, industry, company_size } = prospect;

  return `
You are calling on behalf of ${ALTA_PRODUCT.company}.

PRODUCT: ${ALTA_PRODUCT.name}
What it does: ${ALTA_PRODUCT.description}

VALUE PROPOSITION:
${ALTA_PRODUCT.valueProposition.primary}

KEY FEATURES:
${ALTA_PRODUCT.keyFeatures.map((f, i) => `${i + 1}. ${f}`).join("\n")}

PROSPECT CONTEXT:
- Name: ${name}
- Company: ${company} (${company_size || "Unknown"} employees)
- Role: ${role}
- Industry: ${industry}

WHY THIS MATTERS TO THEM:
${role} at ${industry} companies typically struggle with:
- Manual, time-consuming outreach processes
- Low conversion rates on cold outreach
- Difficulty scaling their sales team

HOW ALTA SOLVES THIS:
Our AI platform automates the entire outbound process - from research to conversation to booking.
Companies like theirs have seen 3x improvement in meeting bookings within 60 days.

MEETING SCHEDULING INSTRUCTIONS:
If the prospect shows interest, offer to schedule a 15-minute discovery call with our account manager.

Suggested times to offer:
- Tomorrow at 10:00 AM, 2:00 PM, or 4:00 PM
- Day after tomorrow at 10:00 AM, 2:00 PM, or 4:00 PM

If they agree to a meeting:
1. Confirm their preferred date and time
2. Confirm their email address
3. Tell them: "Perfect! I'll send you a calendar invite to [their email] for [date/time]. Our account manager will show you exactly how Alta can help ${company}."
4. Let them know they'll receive a confirmation email shortly

IMPORTANT: Be flexible with timing. If none of these times work, ask them for their preferred time in the next week.
`;
}
