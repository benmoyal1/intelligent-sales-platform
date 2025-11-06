# AI Agent Flow Design

## Voice Call Flow (Vapi.ai)

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE CALL AGENT FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. INITIATION
   ┌──────────────┐
   │ User clicks  │
   │ "Start Call" │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Build System Prompt          │
   │ - Prospect data (name, role) │
   │ - Talking points & pain pts  │
   │ - Custom instructions        │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Create Vapi Assistant        │
   │ - Model: GPT-4o-mini         │
   │ - Voice: OpenAI Echo         │
   │ - Transcriber: Deepgram      │
   │ - Webhook URL configured     │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Initiate Phone Call          │
   │ - Vapi calls prospect        │
   │ - First message: "Hi, this   │
   │   is Ben from Alta..."       │
   └──────┬───────────────────────┘
          │
          │
2. CONVERSATION LOOP
          │
          ▼
   ┌──────────────────────────────┐
   │ Prospect speaks              │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Deepgram Nova-2              │
   │ Transcribes speech-to-text   │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ GPT-4o-mini                  │
   │ - Analyzes context           │
   │ - Generates response         │
   │ - Max 150 tokens             │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ OpenAI Text-to-Speech        │
   │ Converts response to voice   │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Vapi Webhook Events          │
   │ - transcript: Real-time text │
   │ - status-update: Call state  │
   │ - end-of-call-report: Done   │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Save to Database             │
   │ Update conversation JSON     │
   └──────┬───────────────────────┘
          │
          │ (Loop until call ends)
          │
          │
3. TERMINATION
          │
          ▼
   ┌──────────────────────────────┐
   │ Call Ends (Manual/Timeout)   │
   │ - User ends call             │
   │ - 60s max duration           │
   │ - 30s silence timeout        │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Final Analysis               │
   │ - Sentiment score (0-1)      │
   │ - BANT qualification         │
   │ - Outcome determination      │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Update Call Record           │
   │ - Status: completed          │
   │ - Duration, sentiment        │
   │ - Meeting booked flag        │
   └──────────────────────────────┘

KEY FEATURES:
✓ Real-time transcription via webhooks
✓ Natural voice (OpenAI Echo)
✓ Custom instructions per prospect
✓ Recording enabled
✓ Live sentiment analysis
```

---

## WhatsApp Flow (Twilio + GPT-4)

```
┌─────────────────────────────────────────────────────────────────┐
│                  WHATSAPP CONVERSATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. CAMPAIGN START
   ┌──────────────┐
   │ User clicks  │
   │ "WhatsApp"   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Initialize Context           │
   │ - Prospect info              │
   │ - Custom instructions        │
   │ - Conversation history []    │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Generate Initial Message     │
   │ GPT-4 → System prompt        │
   │ "Hi [Name], this is Ben      │
   │  from Alta..."               │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Send via Twilio              │
   │ Format: whatsapp:+1234...    │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Store in Database            │
   │ - Call record: in_progress   │
   │ - Conversation JSON          │
   └──────────────────────────────┘
          │
          │
2. CONVERSATION LOOP
          │
          ▼
   ┌──────────────────────────────┐
   │ Prospect Replies             │
   │ Twilio Webhook receives msg  │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Find Active Conversation     │
   │ Match by phone number        │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Add to History               │
   │ { role: 'user', content }    │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Generate AI Response         │
   │ GPT-4 with full history      │
   │ - System prompt + context    │
   │ - All previous messages      │
   │ - Max 300 tokens             │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Analyze Response             │
   │ Secondary GPT-4 call to      │
   │ detect:                      │
   │ - Meeting scheduled?         │
   │ - Should conversation end?   │
   │ - Extract scheduled time     │
   │ - Determine outcome          │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Send Response via Twilio     │
   └──────┬───────────────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │ Update Database              │
   │ Save conversation history    │
   └──────┬───────────────────────┘
          │
          │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌─────────────┐
│Meeting │  │ Continue    │
│Found?  │  │ Conversation│
└───┬────┘  └──────┬──────┘
    │              │
    ▼              │ (Loop back)
┌────────────┐     │
│Create      │     │
│Meeting     │◄────┘
│Record      │
└────┬───────┘
     │
     │
3. TERMINATION
     │
     ▼
┌──────────────────────────────┐
│ End Conversation             │
│ Triggers:                    │
│ - Meeting scheduled          │
│ - Prospect not interested    │
│ - "stop" keyword             │
│ - Max exchanges reached      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Update Records               │
│ - Status: completed          │
│ - Outcome: success/no        │
│ - Meeting booked flag        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Update Prospect Status       │
│ → 'contacted'                │
└──────────────────────────────┘

KEY FEATURES:
✓ Multi-turn AI conversations
✓ Automatic meeting detection
✓ Context-aware responses
✓ Custom instructions per prospect
✓ Intelligent conversation ending
```

---

## AI Agent Components

### Research Agent
```
Input: Prospect data (name, role, company, industry)
   ↓
GPT-4o-mini Analysis
   ↓
Output:
- Talking points (3-5 items)
- Pain points (3-4 items)
- Approach strategy
- Objection handling
- Success probability (0-100%)
```

### Call Agent
```
Input: User message + conversation history
   ↓
GPT-4o-mini with System Prompt
   ↓
Output: Conversational response (max 150 tokens)

Real-time Analysis:
- Sentiment scoring (keyword-based)
- BANT qualification detection
- Next action recommendation
```

### Meeting Detection Agent
```
Input: Conversation exchange
   ↓
GPT-4 Analysis (JSON mode)
   ↓
Output:
{
  "meetingScheduled": boolean,
  "shouldEnd": boolean,
  "outcome": string,
  "scheduledTime": ISO datetime
}
```

---

## Integration Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                       │
└──────────────────────────────────────────────────────────┘

Voice Call Stack:
  Vapi.ai ──────► OpenAI GPT-4o-mini ─► Response generation
    │              Deepgram Nova-2 ───► Speech-to-text
    │              OpenAI Echo ────────► Text-to-speech
    │
    └──► Webhooks ──► Backend ──► Database

WhatsApp Stack:
  Twilio ───────► Backend ──► GPT-4 ─────► Response generation
    │                          GPT-4 ─────► Meeting detection
    │
    └──► Webhooks ──► Message handling ──► Database

Shared Components:
  - System Prompt Builder (dynamic per prospect)
  - Custom Instructions Injection
  - Conversation History Management
  - Meeting Auto-creation
  - Real-time Status Updates
```

---

## Key Differences

| Feature              | Voice (Vapi)           | WhatsApp (Twilio)      |
|---------------------|------------------------|------------------------|
| **AI Model**        | GPT-4o-mini            | GPT-4                  |
| **Response Length** | Max 150 tokens         | Max 300 tokens         |
| **Real-time**       | Yes (webhooks)         | Yes (webhooks)         |
| **Analysis**        | In-memory sentiment    | AI-powered detection   |
| **Meeting Detection**| Manual                | Automatic              |
| **Max Duration**    | 60 seconds             | Unlimited exchanges    |
| **Termination**     | Timeout/Manual         | AI-detected            |

---

Built for intelligent, scalable outbound sales automation.
