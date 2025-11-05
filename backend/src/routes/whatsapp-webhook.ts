import { Router } from 'express';
import { whatsappService } from '../services/whatsapp-service';

export const whatsappWebhookRouter = Router();

/**
 * Twilio WhatsApp Webhook - Handle incoming messages
 * POST /api/whatsapp/webhook
 */
whatsappWebhookRouter.post('/webhook', async (req, res) => {
  try {
    const { From, Body, ProfileName } = req.body;

    console.log(`[WhatsApp Webhook] Received message from ${ProfileName} (${From}): ${Body}`);

    // Handle incoming message with AI service
    await whatsappService.handleIncomingMessage(From, Body);

    // Respond with TwiML (required by Twilio)
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
});

/**
 * Twilio WhatsApp Status Callback
 * POST /api/whatsapp/status
 */
whatsappWebhookRouter.post('/status', async (req, res) => {
  try {
    const { MessageStatus, MessageSid, From, To } = req.body;

    console.log(`[WhatsApp Status] Message ${MessageSid}: ${MessageStatus}`);

    res.sendStatus(200);
  } catch (error) {
    console.error('[WhatsApp Status] Error:', error);
    res.sendStatus(500);
  }
});
