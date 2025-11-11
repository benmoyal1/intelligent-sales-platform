# AI-Powered Outbound Sales Platform

An intelligent sales automation system leveraging multi-agent AI, voice calling, and WhatsApp messaging to qualify prospects and book meetings at scale.

## Assignment Context

**Challenge:** Design an AI-driven scalable solution to automate an outbound call center that books meetings for senior account managers.


**Solution:** Multi-agent architecture with real voice calls (Vapi.ai), WhatsApp automation (Twilio), and automatic meeting detection—demonstrating production-ready patterns within budget constraints.

## Core Features

### AI & Voice Integration
- **Real Voice Calls**: Vapi.ai integration for natural phone conversations with prospects
- **AI Voice Agent**: GPT-4o-mini powered responses with OpenAI Echo voice synthesis
- **Live Transcription**: Deepgram Nova-2 for real-time speech-to-text
- **WhatsApp Automation**: Twilio-powered conversational campaigns with intelligent response generation
- **Multi-Agent System**:
  - Research Agent for prospect analysis and success probability scoring
  - Call Agent for real-time conversation management
  - Meeting Detection Agent for automated scheduling

### Intelligent Analysis
- **RAG-Enhanced Context**: Dynamic system prompts built from prospect data, CRM insights, and conversation history
- **Real-time Sentiment Analysis**: Live sentiment scoring during calls and conversations
- **BANT Qualification**: Automatic detection of Budget, Authority, Need, and Timeline
- **Success Probability Scoring**: AI-powered analysis predicting conversion likelihood (0-100%)
- **Custom Instructions**: Per-prospect AI behavior customization and prompt engineering

### Backend Architecture
- **Load Balancing**: Nginx-based round-robin distribution across 2 backend instances
- **RESTful API**: 25+ endpoints for prospects, calls, meetings, and campaigns
- **JWT Authentication**: Secure token-based auth with bcrypt password hashing
- **Pagination**: Efficient data retrieval with configurable page sizes
- **Real-time Webhooks**: Live updates from Vapi and Twilio integrations
- **SQLite Database**: Lightweight persistence with foreign key constraints

### Frontend Experience
- **Modern React UI**: TypeScript-based SPA with dark theme
- **Real-time Dashboard**: Live statistics for prospects, calls, meetings, and campaigns
- **Prospect Management**: Search, filter, and paginate with inline custom instructions
- **Live Call Interface**: Chat-style UI with real-time sentiment and qualification status
- **Meeting Scheduler**: Automated booking with status tracking and account manager assignment
- **Conversation Viewer**: Full transcript replay for voice and WhatsApp interactions

### Infrastructure & Deployment
- **Docker Compose**: Multi-container orchestration with health checks
- **Shared Data Volumes**: Persistent SQLite database across containers
- **Custom Networking**: Isolated bridge network for service communication
- **Environment Configuration**: Centralized `.env` management for all integrations
- **Production Ready**: Nginx serving React build with optimized assets

## Technology Stack

**AI & Integrations**
- Vapi.ai (voice calls & transcription)
- Twilio (WhatsApp messaging)
- OpenAI GPT-4o-mini (conversational AI)
- Deepgram Nova-2 (speech recognition)

**Backend**
- Node.js + Express + TypeScript
- SQLite (better-sqlite3)
- JWT authentication
- Nginx load balancer

**Frontend**
- React + TypeScript
- React Router (SPA routing)
- Tailwind CSS (dark theme)
- Axios (API client)
- Lucide icons

**DevOps**
- Docker & Docker Compose
- Multi-stage builds
- Volume persistence
- Health monitoring

## API Highlights

- **Authentication**: Login, registration with JWT tokens
- **Prospects**: CRUD operations, AI research, custom instructions, conversation history
- **Calls**: Start/end voice/WhatsApp, real-time messaging, sentiment analysis
- **Meetings**: Automated booking, status updates, account manager assignment
- **Campaigns**: WhatsApp automation, progress tracking, success metrics
- **Webhooks**: Vapi call events, WhatsApp message handling

## Key Statistics

- 5 database tables with relational integrity
- 25+ REST API endpoints
- 3 specialized AI agent services
- 4 external API integrations
- 2 load-balanced backend instances
- 5 frontend pages with real-time updates
- Supports concurrent voice and WhatsApp campaigns

## Architecture

```
┌─────────────┐
│   Frontend  │ ← React SPA (Port 3000)
│   (Nginx)   │
└──────┬──────┘
       │
┌──────▼──────┐
│    Nginx    │ ← Load Balancer (Port 8080)
│  L/B (8080) │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼─┐  ┌─▼──┐
│ BE1│  │ BE2│ ← Backend Instances (Port 3001)
└──┬─┘  └─┬──┘
   └───┬──┘
       │
┌──────▼──────┐
│   SQLite    │ ← Shared Database
└─────────────┘
```

## Security

- JWT tokens with 24-hour expiration
- bcrypt password hashing (10 rounds)
- Environment variable protection
- Token validation middleware
- CORS enabled for cross-origin requests

## Design Decisions

**Multi-Agent Architecture**
Three specialized agents (Research, Call, Meeting Detection) rather than a monolithic agent for better separation of concerns and easier testing/optimization of each component.

**GPT-4o-mini for Voice**
Chosen for cost-efficiency ($0.15 per 1M tokens vs $5 for GPT-4) and low latency. Voice calls need fast responses; mini provides 95% quality at 3% cost.

**SQLite vs PostgreSQL**
SQLite simplifies deployment (no separate DB container) and is sufficient for demo scale. Production would use PostgreSQL for concurrent write performance.

**60-Second Call Limit**
Keeps costs predictable (~$0.10-0.15 per call). Meeting booking conversations rarely need more than 1 minute of effective talk time.

**Load Balancing with 2 Instances**
Demonstrates horizontal scalability thinking without over-engineering. Real production would scale based on metrics and use container orchestration.

**Direct OpenAI API vs LangChain**
LangChain adds abstraction overhead. Direct API calls provide better cost control, clearer debugging, and lower latency for this use case.

## Next Steps - Production Roadmap

**Real-Time Analysis Dashboard**
Live sentiment tracking and BANT scoring visualization during active calls and WhatsApp conversations. Stream analysis results to frontend via WebSockets for sales manager oversight.

**Email Channel Integration**
Extend multi-agent system to email campaigns using SendGrid/Gmail API. Apply same meeting detection logic to email threads for unified omnichannel engagement.

**Calendar Integration**
Google Calendar and Outlook API integration for automated meeting booking. AI agent proposes times, checks availability, sends invites, and syncs with account manager calendars.

**CRM Data Integration**
Bidirectional sync with Salesforce, HubSpot, and Pipedrive. Pull prospect enrichment data (company size, tech stack, recent funding) and push call outcomes, sentiment scores, and meeting bookings back to CRM.

**Advanced Analytics**
Pipeline forecasting, conversion prediction, and A/B testing framework for prompt optimization. Track cost-per-meeting and ROI metrics per campaign.

---

Built with modern AI technologies for intelligent, scalable outbound sales automation.
