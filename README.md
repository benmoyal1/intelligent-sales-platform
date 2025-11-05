# AI-Powered Outbound Sales Platform

A modern, intelligent sales automation platform featuring real-time voice calls and WhatsApp messaging powered by AI. Built to streamline outbound sales operations with automated prospect research, multi-channel engagement, and intelligent meeting scheduling.

## Features

### Multi-Channel AI Automation
- **Voice Calls**: Real-time AI-powered voice conversations using Vapi.ai
- **WhatsApp Campaigns**: Automated messaging campaigns with intelligent conversation handling
- **Smart Prospect Research**: AI-driven prospect analysis with success probability scoring
- **Automated Meeting Scheduling**: AI detects and schedules meetings during conversations

### Smart Prospect Management
- Custom call instructions per prospect
- Automated lead scoring and qualification
- Real-time conversation tracking
- Comprehensive prospect database with search and filtering

### Analytics & Insights
- Real-time dashboard with key metrics
- Call performance tracking
- Meeting conversion analytics
- Success probability indicators

### Modern Dark UI
- **Dark Theme**: Professional dark theme inspired by Claude's interface
- **Optimized Contrast**: Carefully selected colors for optimal readability
- **Smooth Transitions**: Enhanced user experience with subtle animations
- **Responsive Design**: Works seamlessly across all devices

## Tech Stack

### Frontend
- **React** - UI library for building interactive interfaces
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Modern icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Type-safe backend development
- **SQLite** (better-sqlite3) - Embedded database
- **JWT** - Authentication and authorization
- **OpenAI GPT-4** - Conversational AI
- **Vapi.ai SDK** - Real-time voice AI
- **Twilio** - WhatsApp messaging

## Architecture & Design

This platform follows modern software engineering principles:

### Design Patterns
- **Service Layer Pattern**: Business logic separated into dedicated service classes
- **Repository Pattern**: Database access abstracted through data access layer
- **Singleton Pattern**: Single instances for stateful services (WhatsApp service)
- **Observer Pattern**: Webhook-based event handling for external services

### Software Principles
- **SOLID Principles**: Single responsibility, dependency inversion, interface segregation
- **DRY (Don't Repeat Yourself)**: Reusable components and utilities
- **Separation of Concerns**: Clear boundaries between frontend, backend, and services
- **Type Safety**: Full TypeScript implementation across the stack

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Request validation and sanitization
- CORS configuration
- Environment variable protection

## Getting Started

You can run this application in two ways:
1. **Local Development** - Traditional npm-based development
2. **Docker Deployment** - Production-ready containerized deployment with load balancing

### Prerequisites
- Node.js 18+ and npm (for local development)
- Docker & Docker Compose (for containerized deployment)
- OpenAI API key
- Vapi.ai account and API key
- Twilio account (for WhatsApp)

### Quick Start with Docker (Recommended)

For production deployment with 2 backend instances and nginx load balancing:

```bash
# Setup environment
cp .env.docker.example .env.docker
# Edit .env.docker with your API keys

# Build and start all services
make up-build

# Check health
make health
```

Access the application:
- Frontend: http://localhost:3000
- API (Load Balanced): http://localhost:8080/api

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for detailed Docker documentation.

### Local Development Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd alta_system
```

2. **Install dependencies**

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

3. **Configure environment variables**

Create `.env` in the backend directory:
```env
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-here

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Vapi.ai
VAPI_API_KEY=your-vapi-api-key
VAPI_PHONE_NUMBER=your-vapi-phone-number

# Twilio (for WhatsApp)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

Create `.env` in the frontend directory:
```env
VITE_API_URL=http://localhost:3001/api
```

4. **Initialize the database**
```bash
cd backend
npm run seed
```

5. **Start the development servers**

Backend:
```bash
cd backend
npm run dev
```

Frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

6. **Access the application**
Open http://localhost:5173 in your browser

Default login credentials:
- Username: `demo`
- Password: `password`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Prospects
- `GET /api/prospects` - List all prospects
- `GET /api/prospects/:id` - Get prospect details
- `POST /api/prospects` - Create new prospect
- `POST /api/prospects/:id/research` - Run AI research on prospect
- `PATCH /api/prospects/:id/instructions` - Update custom call instructions
- `GET /api/prospects/stats/summary` - Get prospect statistics

### Calls
- `GET /api/calls` - List all calls
- `GET /api/calls/:id` - Get call details
- `POST /api/calls/start` - Start voice or WhatsApp call
- `POST /api/calls/:id/message` - Send message during call
- `POST /api/calls/:id/end` - End call and record outcome
- `GET /api/calls/stats/summary` - Get call statistics

### Meetings
- `GET /api/meetings` - List all meetings
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings` - Create new meeting
- `PATCH /api/meetings/:id/status` - Update meeting status
- `GET /api/meetings/stats/summary` - Get meeting statistics

### WhatsApp Webhooks
- `POST /api/whatsapp/webhook` - Receive incoming WhatsApp messages
- `POST /api/whatsapp/status` - Receive message status updates

## Project Structure

```
alta_system/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── database.ts      # Database initialization
│   │   └── server.ts        # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   └── App.tsx         # Main app component
│   └── package.json
└── README.md
```

## Development Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run seed` - Seed database with sample data
- `npm run seed-100` - Seed 100 prospects for testing

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Makefile Commands (Docker)
```bash
make help              # Show all available commands
make up                # Start all containers
make up-build          # Build and start containers
make down              # Stop all containers
make logs              # View logs from all services
make health            # Check health of all services
make restart-backend   # Restart backend instances
make seed              # Seed database
```

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for complete command reference.

## Scalability & Deployment

### Production Architecture

The Docker deployment provides a scalable, production-ready architecture:

```
┌─────────────┐
│   Frontend  │ :3000
│   (Nginx)   │
└─────────────┘
       │
       ↓
┌─────────────┐
│   Nginx LB  │ :8080 (Round Robin)
└─────────────┘
       │
    ┌──┴──┐
    ↓     ↓
┌────────┐ ┌────────┐
│Backend1│ │Backend2│ :3001
└────────┘ └────────┘
    │          │
┌────────┐ ┌────────┐
│  DB 1  │ │  DB 2  │
└────────┘ └────────┘
```

### Key Features:
- **Load Balancing**: Nginx distributes requests across 2 backend instances using round-robin
- **High Availability**: If one backend fails, traffic automatically routes to healthy instances
- **Health Checks**: All services have automated health monitoring
- **Auto-Restart**: Containers automatically restart on failure
- **Separate Data**: Each backend has its own database volume for data isolation
- **Rate Limiting**: 10 requests/second per IP with burst capacity
- **Resource Monitoring**: Built-in health and stats commands

### Scaling Horizontally

To add more backend instances:
1. Add new backend service in `docker-compose.yml`
2. Update nginx upstream servers in `nginx/nginx.conf`
3. Run `make down && make up-build`

The architecture supports adding as many backend instances as needed for your load requirements.

## Key Features Explained

### Voice Calls
Voice calls use Vapi.ai for real-time AI conversations. The system:
1. Runs AI research on the prospect
2. Generates a custom system prompt with prospect context
3. Initiates a real-time voice call through Vapi.ai
4. Tracks conversation and automatically detects meeting agreements

### WhatsApp Campaigns
WhatsApp campaigns provide asynchronous messaging automation:
1. Sends initial AI-generated outreach message
2. Handles incoming responses via Twilio webhook
3. Generates contextual AI responses using conversation history
4. Automatically detects meeting scheduling or conversation completion
5. Creates meeting records when prospects agree

### AI Research
The research system analyzes prospects and provides:
- Success probability scoring (0-100%)
- Key talking points tailored to the prospect
- Pain points and objections
- Recommended approach strategies

## Future Enhancements

- Email campaign integration
- Advanced analytics and reporting
- CRM integrations (Salesforce, HubSpot)
- Calendar integration (Google Calendar, Outlook)
- Team collaboration features
- A/B testing for messaging strategies
- Voice sentiment analysis
- Multi-language support

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
