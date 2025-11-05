# 🚀 START HERE - Quick Launch

## Get Your Demo Running in 5 Minutes

### Step 1: Get OpenAI API Key (2 min)

1. Go to https://platform.openai.com/api-keys
2. Sign up or login
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)
5. Keep it handy!

### Step 2: Setup & Run (3 min)

Open terminal and run these commands:

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=YOUR_KEY_HERE
JWT_SECRET=demo-secret-change-in-production
DB_PATH=./data/outbound.db
EOF

# IMPORTANT: Edit .env and replace YOUR_KEY_HERE with your actual OpenAI key
# On Mac/Linux: nano .env
# On Windows: notepad .env

# Create data directory
mkdir -p data

# Seed database with demo data
npm run seed

# Start backend (keep this running)
npm run dev
```

### Step 3: Start Frontend (1 min)

Open a **NEW terminal** window:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

### Step 4: Open & Login

1. Open browser: http://localhost:3000
2. Login with:
   - **Username**: `demo`
   - **Password**: `demo123`

### Step 5: Try It!

1. Go to "Prospects" page
2. Click "Research" on any prospect → Uses AI to analyze
3. Click "Start Call" → Opens chat simulator
4. Type responses as the prospect → Watch AI adapt!

---

## ✅ Checklist

Make sure you have:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] OpenAI API key
- [ ] Backend running (you'll see: "Server running on http://localhost:3001")
- [ ] Frontend running (you'll see: "Local: http://localhost:3000")
- [ ] Can login at http://localhost:3000

---

## 🐛 Quick Fixes

### "Command not found: npm"
→ Install Node.js from https://nodejs.org (get version 18+)

### "OpenAI API error"
→ Check your API key in `backend/.env` is correct

### "Cannot connect to backend"
→ Make sure backend is running in another terminal (port 3001)

### "Database locked"
```bash
rm backend/data/outbound.db
cd backend
npm run seed
npm run dev
```

---

## 📚 Next Steps

Once it's running:

1. **Read this**: [MVP_README.md](MVP_README.md) - Overview of features
2. **Practice demo**: Follow the demo script in [MVP_DEPLOYMENT_GUIDE.md](MVP_DEPLOYMENT_GUIDE.md)
3. **Prep for interview**: Read [ALTA_INTERVIEW_GUIDE.md](ALTA_INTERVIEW_GUIDE.md)
4. **Understand architecture**: Skim [SOLUTION_DESIGN.md](SOLUTION_DESIGN.md)

---

## 🎯 Quick Demo Test

Try this workflow:

1. **Dashboard** - See overview stats
2. **Prospects** → Click "Research" on Sarah Johnson
   - Wait 5 seconds
   - See AI-generated talking points and success probability
3. **Click "Start Call"**
   - Read AI's opening message
   - Type: "Yes, this is Sarah. What's this about?"
   - Type: "Tell me more about what you do"
   - Watch sentiment score and qualification status update
4. **Click "Book Meeting"** or "End Call"

If all that works → YOU'RE READY! 🎉

---

## 💰 Cost Check

Your demo costs:
- Research a prospect: ~$0.001
- 10-message conversation: ~$0.003
- **Total for testing: < $0.50**

To check your OpenAI usage: https://platform.openai.com/usage

---

## 🆘 Need Help?

1. Check [MVP_DEPLOYMENT_GUIDE.md](MVP_DEPLOYMENT_GUIDE.md) troubleshooting section
2. Look at terminal logs (backend and frontend)
3. Check browser console (F12 → Console tab)
4. Make sure ports 3000 and 3001 aren't already in use

---

## 🎬 Ready for Interview?

Make sure you can:
- [ ] Run the system without errors
- [ ] Explain what the Research Agent does
- [ ] Demo the call simulator
- [ ] Talk about the multi-agent architecture
- [ ] Discuss how it scales
- [ ] Answer "why text instead of voice?"
- [ ] Explain cost per call

Read [ALTA_INTERVIEW_GUIDE.md](ALTA_INTERVIEW_GUIDE.md) for talking points!

---

**Time to working demo**: 5 minutes
**Cost to run**: < $1
**Impressiveness factor**: 🚀🚀🚀

You've got this! 💪
