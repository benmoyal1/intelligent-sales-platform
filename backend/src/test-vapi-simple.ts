import dotenv from 'dotenv';
dotenv.config();

import { db, initDatabase } from './database';
import { getProductPitch, ALTA_PRODUCT } from './config/product';

async function testVapiCall() {
  console.log('🧪 Testing Vapi Voice Call with Alta Product Context\n');

  initDatabase();

  const prospect = db.prepare('SELECT * FROM prospects LIMIT 1').get() as any;

  console.log('📋 Test Prospect:');
  console.log(`   Name: ${prospect.name}`);
  console.log(`   Company: ${prospect.company}`);
  console.log(`   Role: ${prospect.role}`);
  console.log(`   Phone: ${prospect.phone}\n`);

  // Check if prospect has research data
  let researchData = null;
  if (prospect.research_data) {
    try {
      researchData = JSON.parse(prospect.research_data);
      console.log('✓ Using existing research data\n');
    } catch (e) {
      console.log('⚠️  Research data exists but invalid, will use basic context\n');
    }
  } else {
    console.log('⚠️  No research data found, will use basic context\n');
  }

  // Build comprehensive system prompt
  const productPitch = getProductPitch(prospect);

  const systemPrompt = `You are Katie, an AI Sales Development Representative calling on behalf of ${ALTA_PRODUCT.company}.

${productPitch}

${researchData ? `
RESEARCH INSIGHTS:
${researchData.talking_points ? `Talking Points: ${researchData.talking_points.join(', ')}` : ''}
${researchData.pain_points ? `Pain Points: ${researchData.pain_points.join(', ')}` : ''}
` : ''}

YOUR OBJECTIVE:
1. Confirm you're speaking with ${prospect.name}
2. Briefly introduce Alta and how it helps ${prospect.role}s at ${prospect.industry} companies
3. Share 1-2 key benefits relevant to their role
4. Gauge interest and offer to schedule a 15-minute demo
5. Handle objections professionally

CONVERSATION STYLE:
- Be friendly, professional, and confident
- Keep responses concise (2-3 sentences max)
- Ask questions to understand their needs
- Focus on value, not features
- Respect their time (60 second call limit)

IMPORTANT:
- If they're not interested, thank them politely and end the call
- If they're interested, offer specific demo times
- Always be helpful and authentic`;

  console.log('📞 Making real phone call via Vapi API...\n');

  try {
    // Step 1: Create assistant with full context
    const assistantResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Alta Sales Call - ${prospect.name}`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          messages: [{
            role: 'system',
            content: systemPrompt
          }]
        },
        voice: {
          provider: 'openai',
          voiceId: 'alloy'
        },
        firstMessage: `Hi, is this ${prospect.name}?`,
        maxDurationSeconds: 60,
        silenceTimeoutSeconds: 30
      })
    });

    if (!assistantResponse.ok) {
      const error = await assistantResponse.text();
      throw new Error(`Failed to create assistant: ${assistantResponse.status} - ${error}`);
    }

    const assistant: any = await assistantResponse.json();
    console.log(`✓ Assistant created: ${assistant.id}\n`);

    // Step 2: Make the call
    const callResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: assistant.id,
        customer: {
          number: prospect.phone,
          name: prospect.name
        },
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID
      })
    });

    if (!callResponse.ok) {
      const error = await callResponse.text();
      throw new Error(`Failed to make call: ${callResponse.status} - ${error}`);
    }

    const call: any = await callResponse.json();

    console.log('✅ SUCCESS! Voice call initiated!\n');
    console.log(`   Call ID: ${call.id}`);
    console.log(`   Status: ${call.status || 'initiated'}`);
    console.log(`   \n   🎉 Your phone (${prospect.phone}) should ring in a few seconds!`);
    console.log(`   \n   💡 Answer the call and talk to Katie, the AI assistant!\n`);

  } catch (error: any) {
    console.error('❌ Call failed:', error.message);

    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n   Issue: Authentication failed');
      console.log('   Fix: Check your VAPI_API_KEY is correct\n');
    } else if (error.message.includes('404')) {
      console.log('\n   Issue: Phone number not found');
      console.log('   Fix: Check your VAPI_PHONE_NUMBER_ID is correct\n');
    } else if (error.message.includes('phone')) {
      console.log('\n   Issue: Invalid phone number format');
      console.log('   Fix: Phone should be in format: +972525703444\n');
    }
  }
}

testVapiCall()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
