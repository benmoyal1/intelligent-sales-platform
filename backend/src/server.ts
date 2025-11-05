import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { prospectsRouter } from './routes/prospects';
import { callsRouter } from './routes/calls';
import { campaignsRouter } from './routes/campaigns';
import { realCallsRouter } from './routes/real-calls';
import { meetingsRouter } from './routes/meetings';
import { whatsappWebhookRouter } from './routes/whatsapp-webhook';
import { initDatabase } from './database';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/prospects', prospectsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/real-calls', realCallsRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/whatsapp', whatsappWebhookRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
