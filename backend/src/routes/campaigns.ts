import { Router } from 'express';
import { db } from '../database';
import { authenticateToken } from '../middleware/auth';

export const campaignsRouter = Router();

// Get all campaigns
campaignsRouter.get('/', authenticateToken, (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
    res.json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get campaign stats
campaignsRouter.get('/stats/summary', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(target_count) as total_targets,
        SUM(completed_count) as total_completed
      FROM campaigns
    `).get();

    res.json(stats);
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
