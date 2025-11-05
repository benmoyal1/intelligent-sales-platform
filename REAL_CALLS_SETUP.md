# 📞 Real Calls & WhatsApp Setup Guide

Complete guide to making **real phone calls** and sending **WhatsApp messages** with your AI agent system.

---

## 🎯 Services Overview

### **Voice Calls: Vapi.ai** (Recommended for MVP)
- **Cost**: ~$0.05-0.15 per minute
- **Setup**: 30 minutes
- **Trial**: Free credits available
- **Best for**: Quick MVP demo

### **WhatsApp: Twilio**
- **Cost**: ~$0.005 per message
- **Setup**: 1 hour
- **Trial**: $15 free credits
- **Best for**: Text-based outreach

---

## 🚀 Setup Part 1: Voice Calls with Vapi.ai

### **Step 1: Sign Up for Vapi.ai**

1. Go to https://vapi.ai
2. Click "Sign Up" (they offer free trial credits!)
3. Complete registration
4. Go to Dashboard → API Keys
5. Copy your API key

### **Step 2: Get a Phone Number**

1. In Vapi dashboard, go to "Phone Numbers"
2. Click "Buy Number"
3. Select your country (Israel: +972)
4. Choose a number (~$1-2/month)
5. Copy the Phone Number ID

### **Step 3: Add to Environment Variables**

```bash
cd backend
nano .env
```

Add these lines:
```bash
# Vapi.ai Configuration
VAPI_API_KEY=your_vapi_api_key_here
VAPI_PHONE_NUMBER_ID=your_phone_number_id_here
```

### **Step 4: Install Dependencies**

```bash
npm install @vapi-ai/server-sdk
```

### **Step 5: Test Voice Call**

```bash
# Start your backend
npm run dev
```

Then make a test call via API:
```bash
curl -X POST http://localhost:3001/api/real-calls/voice/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prospect_id": "YOUR_PROSPECT_ID"}'
```

**Expected behavior:**
- Your phone will ring!
- AI agent (Katie) will speak: "Hi, is this [Name]?"
- You can have a natural conversation
- Agent follows BANT qualification framework
- Call is recorded and transcribed

---

## 💬 Setup Part 2: WhatsApp with Twilio

### **Step 1: Sign Up for Twilio**

1. Go to https://www.twilio.com/try-twilio
2. Sign up (get $15 free trial credits)
3. Verify your phone number
4. Complete registration

### **Step 2: Get WhatsApp Sandbox (for testing)**

1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow instructions to join sandbox:
   - Send "join [your-code]" to Twilio's WhatsApp number
3. Copy your sandbox number (e.g., whatsapp:+14155238886)

### **Step 3: Get Twilio Credentials**

1. Go to Twilio Console Dashboard
2. Copy **Account SID**
3. Copy **Auth Token**

### **Step 4: Add to Environment Variables**

```bash
nano .env
```

Add:
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### **Step 5: Install Dependencies**

```bash
npm install twilio
```

### **Step 6: Test WhatsApp Message**

```bash
curl -X POST http://localhost:3001/api/real-calls/whatsapp/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prospect_id": "YOUR_PROSPECT_ID"}'
```

**Expected behavior:**
- WhatsApp message arrives on your phone
- Personalized message with prospect name
- Includes talking points from AI research
- CTA to schedule a call

---

## 🎨 Frontend Integration

### **Add Buttons to ProspectsPage**

Update `frontend/src/pages/ProspectsPage.tsx`:

```typescript
// Add after existing "Start Call" button

<button
  onClick={() => handleRealCall(prospect.id)}
  disabled={startingRealCallId === prospect.id}
  className="inline-flex items-center px-3 py-1.5 ml-2 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
>
  <Phone className="w-3 h-3 mr-1" />
  {startingRealCallId === prospect.id ? 'Calling...' : 'Real Call'}
</button>

<button
  onClick={() => handleWhatsApp(prospect.id)}
  disabled={sendingWhatsAppId === prospect.id}
  className="inline-flex items-center px-3 py-1.5 ml-2 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
>
  <MessageCircle className="w-3 h-3 mr-1" />
  {sendingWhatsAppId === prospect.id ? 'Sending...' : 'WhatsApp'}
</button>
```

### **Add Handler Functions**

```typescript
const [startingRealCallId, setStartingRealCallId] = useState<string | null>(null);
const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);

const handleRealCall = async (prospectId: string) => {
  if (!confirm('This will make a REAL phone call. Continue?')) return;

  setStartingRealCallId(prospectId);
  try {
    const response = await axios.post('/api/real-calls/voice/start', {
      prospect_id: prospectId
    });
    alert(`Call initiated! Call ID: ${response.data.vapi_call_id}`);
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to start call');
  } finally {
    setStartingRealCallId(null);
  }
};

const handleWhatsApp = async (prospectId: string) => {
  setSendingWhatsAppId(prospectId);
  try {
    const response = await axios.post('/api/real-calls/whatsapp/send', {
      prospect_id: prospectId
    });
    alert('WhatsApp message sent!');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to send WhatsApp');
  } finally {
    setSendingWhatsAppId(null);
  }
};
```

---

## 💰 Cost Breakdown

### **Voice Calls (Vapi.ai)**

```
Per Call Cost:
- Vapi fee: ~$0.05-0.15 per minute
- OpenAI GPT-4o-mini: included in Vapi pricing
- Total: ~$0.10 per minute

Example Demo (50 calls × 2 min avg):
- 100 minutes × $0.10 = $10
```

### **WhatsApp (Twilio)**

```
Per Message Cost:
- Outbound message: $0.005
- Inbound message: $0.005
- Total conversation (10 messages): $0.05

Example Demo (50 prospects × 10 messages):
- 500 messages × $0.005 = $2.50
```

### **Total MVP Demo Budget: ~$12.50** ✅

---

## 🎯 Production Upgrade Path

### **For Approved WhatsApp Business API**

After demo, upgrade to official WhatsApp Business API:

1. **Apply for WhatsApp Business Account**
   - Go to Meta Business Suite
   - Apply for WhatsApp Business API
   - Takes 1-2 weeks approval

2. **Connect to Twilio**
   - Link your approved business number
   - Configure templates
   - No more sandbox limitations

3. **Benefits**:
   - Custom sender name (your business name)
   - Message templates
   - Better deliverability
   - No sandbox restrictions

### **For Production Voice (Scale)**

When scaling beyond MVP:

1. **Option A: Keep Vapi.ai**
   - Easiest
   - Good for up to 1,000 calls/day
   - Built-in monitoring

2. **Option B: Twilio + OpenAI Realtime**
   - More control
   - Lower cost at scale (~$0.11/min total)
   - Custom voice cloning
   - Advanced features

---

## 🧪 Testing Checklist

### **Voice Call Testing**

- [ ] Call connects to your phone
- [ ] AI agent speaks naturally
- [ ] Agent follows conversation flow
- [ ] Handles objections appropriately
- [ ] Can book a meeting
- [ ] Call recording works
- [ ] Transcript is accurate

### **WhatsApp Testing**

- [ ] Message arrives on WhatsApp
- [ ] Personalized with prospect name
- [ ] Includes relevant talking points
- [ ] CTA is clear
- [ ] Can receive replies
- [ ] Webhook processes replies

---

## 🚨 Important Notes

### **For Demo/Interview**

1. **Test with YOUR phone first**
   - Don't call real prospects without permission
   - Use your Israeli number: +972525703444

2. **During Interview**
   - Show the code/architecture (impressive!)
   - Maybe do ONE live demo call to yourself
   - Explain how it works (they care more about thinking)

3. **Compliance**
   - Mention TCPA/GDPR awareness
   - Talk about consent management
   - Show DNC list integration plan

### **Cost Management**

1. **Set Twilio Spending Limits**
   - Dashboard → Settings → Notifications
   - Set alert at $10
   - Set hard limit at $20

2. **Monitor Vapi Usage**
   - Check dashboard daily
   - Set budget alerts
   - Review call logs

---

## 📊 Quick Start Commands

```bash
# Install all dependencies
cd backend
npm install @vapi-ai/server-sdk twilio

# Add environment variables
echo "VAPI_API_KEY=your_key" >> .env
echo "VAPI_PHONE_NUMBER_ID=your_id" >> .env
echo "TWILIO_ACCOUNT_SID=your_sid" >> .env
echo "TWILIO_AUTH_TOKEN=your_token" >> .env
echo "TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886" >> .env

# Update server to include new routes
# (Add to src/server.ts: app.use('/api/real-calls', realCallsRouter))

# Restart server
npm run dev

# Test voice call
curl -X POST http://localhost:3001/api/real-calls/voice/start \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"prospect_id": "abc123"}'

# Test WhatsApp
curl -X POST http://localhost:3001/api/real-calls/whatsapp/send \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"prospect_id": "abc123"}'
```

---

## 🎓 For Your Alta Interview

### **What to Highlight**

1. **Architecture Flexibility**:
   - "I designed the system with multiple channel support"
   - "Can switch between text simulation, voice, WhatsApp easily"
   - "Same AI agent logic works across all channels"

2. **Cost Optimization**:
   - "Used Vapi for quick MVP ($0.10/min)"
   - "Can migrate to Twilio+OpenAI for scale ($0.06/min savings)"
   - "WhatsApp is 50x cheaper than voice ($0.005 vs $0.25/min)"

3. **Production Thinking**:
   - "Built with webhooks for bidirectional communication"
   - "Error handling and retry logic"
   - "Compliance considerations (TCPA, GDPR)"

### **Demo Strategy**

**Option A: Live Call (Impressive!)**
```
1. Show prospect in UI
2. Click "Real Call" button
3. Your phone rings
4. Talk to AI agent
5. Show transcript/recording after
```

**Option B: Show Architecture (Safer)**
```
1. Walk through voice-service-real.ts
2. Explain Vapi integration
3. Show WhatsApp service
4. Discuss multi-channel strategy
```

---

## 🔗 Useful Links

- **Vapi.ai Docs**: https://docs.vapi.ai
- **Twilio WhatsApp**: https://www.twilio.com/docs/whatsapp
- **OpenAI Realtime**: https://platform.openai.com/docs/guides/realtime
- **Pricing Calculator**: https://vapi.ai/pricing

---

**You now have everything needed to make REAL calls and send WhatsApp messages!** 🎉

Choose your integration approach:
- **Quick MVP**: Use the code files I created
- **Production**: Add error handling, monitoring, analytics
- **Scale**: Optimize costs, add queuing, rate limiting

Good luck with your demo! 🚀
