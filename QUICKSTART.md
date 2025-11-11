# Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- API keys for Vapi, Twilio, and OpenAI

## Setup

1. **Configure Environment Variables**

   ```bash
   cp .env.example .env.docker
   ```

   Edit `.env.docker` with your API keys:

   - `VAPI_API_KEY` - Vapi.ai credentials
   - `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN` - WhatsApp integration
   - `OPENAI_API_KEY` - AI agent access

2. **Start the Application**

   ```bash
   make up-build-start
   ```

3. **Access the Platform**
   - Frontend: http://localhost:3000
   - API: http://localhost:8080/api
   - Login: `test` / `test123`

## What's Running

- 2 backend servers (load balanced)
- Nginx load balancer
- React frontend
- SQLite database

The system is now ready for AI-powered outbound sales calls via voice and WhatsApp.
