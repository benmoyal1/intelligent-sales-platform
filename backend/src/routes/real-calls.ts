import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { authenticateToken } from '../middleware/auth';
import { RealVoiceService } from '../services/voice-service-real';
import { WhatsAppService } from '../services/whatsapp-service';
import { CallAgentService } from '../services/call-agent';

export const realCallsRouter = Router();

// Initialize services
const callAgent = new CallAgentService();
const voiceService = new RealVoiceService(callAgent);
const whatsappService = new WhatsAppService();

/**
 * Make a real phone call
 */
realCallsRouter.post('/voice/start', authenticateToken, async (req, res) => {
  try {
    const { prospect_id } = req.body;

    // Get prospect with research data
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(prospect_id) as any;

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    if (!prospect.research_data) {
      return res.status(400).json({ error: 'Prospect must be researched first' });
    }

    const research = JSON.parse(prospect.research_data);

    // Build call context
    const callContext = {
      prospect_info: {
        prospect: {
          id: prospect.id,
          name: prospect.name,
          company: prospect.company,
          role: prospect.role,
        },
        crm_data: {
          industry: prospect.industry,
          account_status: prospect.status,
          past_interactions: [],
        },
        talking_points: research.talking_points,
        pain_points: research.pain_points,
        objection_strategies: research.objection_strategies,
        success_probability: research.success_probability,
      },
      call_objective: 'book a discovery meeting',
      account_manager: {
        id: 'am-001',
        name: 'Account Manager',
        email: 'am@company.com',
        specialty: 'Sales',
        calendar_link: 'https://calendar.com/am',
      },
      conversation_state: {
        stage: 'opening' as const,
        turns: 0,
        sentiment: 0.5,
        objections_raised: [],
      },
      campaign_id: 'real-call',
    };

    // Make the real call!
    const call = await voiceService.makeRealCall(prospect.phone, callContext);

    // Save to database
    const callId = uuidv4();
    db.prepare(
      `INSERT INTO calls (id, prospect_id, status, conversation)
       VALUES (?, ?, 'active', '[]')`
    ).run(callId, prospect_id);

    res.json({
      success: true,
      call_id: callId,
      vapi_call_id: call.callId,
      status: call.status,
      message: `Real call initiated to ${prospect.phone}`,
    });
  } catch (error: any) {
    console.error('Real call error:', error);
    res.status(500).json({ error: error.message || 'Failed to start call' });
  }
});

/**
 * Send WhatsApp message
 */
realCallsRouter.post('/whatsapp/send', authenticateToken, async (req, res) => {
  try {
    const { prospect_id } = req.body;

    // Get prospect with research data
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(prospect_id) as any;

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    if (!prospect.research_data) {
      return res.status(400).json({ error: 'Prospect must be researched first' });
    }

    const research = JSON.parse(prospect.research_data);

    // Build context for message
    const callContext = {
      prospect_info: {
        prospect: {
          id: prospect.id,
          name: prospect.name,
          company: prospect.company,
          role: prospect.role,
        },
        crm_data: {
          industry: prospect.industry,
          account_status: prospect.status,
          past_interactions: [],
        },
        talking_points: research.talking_points,
        pain_points: research.pain_points,
      },
    };

    // Send WhatsApp message
    const result = await whatsappService.sendOutreachMessage(
      prospect.phone,
      prospect.name,
      callContext as any
    );

    // Log activity
    db.prepare(
      `INSERT INTO calls (id, prospect_id, status, outcome)
       VALUES (?, ?, 'completed', 'whatsapp_sent')`
    ).run(uuidv4(), prospect_id);

    res.json({
      success: true,
      message_id: result.messageId,
      message: `WhatsApp message sent to ${prospect.phone}`,
    });
  } catch (error: any) {
    console.error('WhatsApp error:', error);
    res.status(500).json({ error: error.message || 'Failed to send WhatsApp' });
  }
});

/**
 * Get call status (for monitoring real calls)
 */
realCallsRouter.get('/voice/status/:callId', authenticateToken, async (req, res) => {
  try {
    const status = await voiceService.getCallStatus(req.params.callId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook for incoming WhatsApp messages
 */
realCallsRouter.post('/whatsapp/webhook', async (req, res) => {
  try {
    const response = await whatsappService.handleIncomingMessage(req.body);

    // Twilio expects TwiML response
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response}</Message>
</Response>`);
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing message');
  }
});
