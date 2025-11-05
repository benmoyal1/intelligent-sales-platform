import dotenv from 'dotenv';
dotenv.config();

import { db, initDatabase } from './database';
const VapiModule = require('@vapi-ai/server-sdk/dist/cjs/index.js');
const Vapi = VapiModule.default || VapiModule.Vapi || VapiModule;
import twilio from 'twilio';

async function testRealCalls() {
  console.log('🧪 Testing Real Calls Integration\n');

  // Initialize database
  initDatabase();

  // Get first prospect
  const prospect = db.prepare('SELECT * FROM prospects LIMIT 1').get() as any;

  if (!prospect) {
    console.error('❌ No prospects found in database');
    console.log('Run: npm run seed');
    return;
  }

  console.log('📋 Test Prospect:');
  console.log(`   Name: ${prospect.name}`);
  console.log(`   Phone: ${prospect.phone}`);
  console.log(`   Company: ${prospect.company}\n`);

  // Check which services are configured
  const vapiConfigured = process.env.VAPI_API_KEY && process.env.VAPI_API_KEY !== 'your_vapi_api_key_here';
  const twilioConfigured = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid_here';

  console.log('🔧 Configuration Status:');
  console.log(`   Vapi API Key: ${process.env.VAPI_API_KEY ? process.env.VAPI_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`   Vapi Phone ID: ${process.env.VAPI_PHONE_NUMBER_ID ? process.env.VAPI_PHONE_NUMBER_ID.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`   Twilio SID: ${process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`   Twilio Token: ${process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log('');
  console.log(`   Vapi (Voice): ${vapiConfigured ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`   Twilio (WhatsApp): ${twilioConfigured ? '✓ Configured' : '✗ Not configured'}\n`);

  // Test Voice Call
  if (vapiConfigured) {
    console.log('📞 Testing Voice Call with Vapi...');
    try {
      const vapi = new Vapi({ token: process.env.VAPI_API_KEY || '' });

      // Create assistant
      const assistant = await vapi.assistants.create({
        name: `Test call to ${prospect.name}`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `You are Katie, a friendly AI sales assistant. You're calling ${prospect.name} from ${prospect.company}. Keep it brief and natural.`,
            },
          ],
        },
        voice: {
          provider: 'openai',
          voiceId: 'alloy',
        },
        firstMessage: `Hi, is this ${prospect.name}?`,
        recordingEnabled: true,
      });

      // Make the call
      const call = await vapi.calls.create({
        assistantId: assistant.id,
        customer: {
          number: prospect.phone,
          name: prospect.name,
        },
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      });

      console.log('✓ Voice call initiated successfully!');
      console.log(`   Call ID: ${call.id}`);
      console.log(`   Status: initiated`);
      console.log(`   Your phone (${prospect.phone}) should ring shortly!\n`);
    } catch (error: any) {
      console.error('✗ Voice call failed:', error.message);
      if (error.message.includes('401')) {
        console.log('   Check: Your Vapi API key is correct\n');
      } else if (error.message.includes('phone')) {
        console.log('   Check: Phone number format is correct (+972...)\n');
      } else {
        console.log('   Full error:', error, '\n');
      }
    }
  } else {
    console.log('⏭️  Skipping voice call test (Vapi not configured)\n');
  }

  // Test WhatsApp
  if (twilioConfigured) {
    console.log('💬 Testing WhatsApp Message with Twilio...');
    try {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const message = `Hi ${prospect.name}! 👋

This is a test message from your AI outbound system.

Your phone number (${prospect.phone}) is configured and working!

This message was sent via Twilio WhatsApp API.`;

      const result = await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
        to: `whatsapp:${prospect.phone}`,
        body: message,
      });

      console.log('✓ WhatsApp message sent successfully!');
      console.log(`   Message ID: ${result.sid}`);
      console.log(`   Check WhatsApp on ${prospect.phone}\n`);
    } catch (error: any) {
      console.error('✗ WhatsApp failed:', error.message);
      if (error.code === 21608) {
        console.log('   Error: Phone number not verified in sandbox');
        console.log('   Solution: Join sandbox by sending "join [code]" to Twilio WhatsApp number\n');
      } else if (error.code === 20003) {
        console.log('   Error: Authentication failed');
        console.log('   Check: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct\n');
      } else {
        console.log('   Full error:', error, '\n');
      }
    }
  } else {
    console.log('⏭️  Skipping WhatsApp test (Twilio not configured)\n');
  }

  console.log('✨ Test complete!\n');
}

// Run test
testRealCalls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
