import { Router } from 'express';
import { db } from '../database';
import { authenticateToken } from '../middleware/auth';
import { ResearchAgentService } from '../services/research-agent';
import { v4 as uuidv4 } from 'uuid';

export const prospectsRouter = Router();
const researchAgent = new ResearchAgentService();

// Get all prospects
prospectsRouter.get('/', authenticateToken, (req, res) => {
  try {
    const prospects = db.prepare('SELECT * FROM prospects ORDER BY created_at DESC').all();
    res.json(prospects);
  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

// Create new prospect
prospectsRouter.post('/', authenticateToken, (req, res) => {
  try {
    const { name, email, phone, company, role, industry, company_size, custom_instructions } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !company) {
      return res.status(400).json({ error: 'Name, email, phone, and company are required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO prospects (id, name, email, phone, company, role, industry, company_size, custom_instructions, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `).run(id, name, email, phone, company, role || null, industry || null, company_size || null, custom_instructions || null, now);

    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(id);
    res.json(prospect);
  } catch (error) {
    console.error('Create prospect error:', error);
    res.status(500).json({ error: 'Failed to create prospect' });
  }
});

// Get single prospect
prospectsRouter.get('/:id', authenticateToken, (req, res) => {
  try {
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    res.json(prospect);
  } catch (error) {
    console.error('Get prospect error:', error);
    res.status(500).json({ error: 'Failed to fetch prospect' });
  }
});

// Update prospect custom instructions
prospectsRouter.patch('/:id/instructions', authenticateToken, (req, res) => {
  try {
    const { custom_instructions } = req.body;

    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    db.prepare('UPDATE prospects SET custom_instructions = ? WHERE id = ?').run(
      custom_instructions || null,
      req.params.id
    );

    const updatedProspect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id);
    res.json(updatedProspect);
  } catch (error) {
    console.error('Update instructions error:', error);
    res.status(500).json({ error: 'Failed to update instructions' });
  }
});

// Run research on prospect
prospectsRouter.post('/:id/research', authenticateToken, async (req, res) => {
  try {
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(req.params.id) as any;

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    console.log(`Running research for ${prospect.name}...`);

    // Run AI research agent
    const research = await researchAgent.analyzeProspect({
      name: prospect.name,
      company: prospect.company,
      role: prospect.role,
      industry: prospect.industry,
      company_size: prospect.company_size,
    });

    // Update prospect with research data
    db.prepare(`
      UPDATE prospects
      SET research_data = ?, success_probability = ?, status = 'researched'
      WHERE id = ?
    `).run(
      JSON.stringify(research),
      research.success_probability,
      prospect.id
    );

    res.json(research);
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({ error: 'Failed to run research' });
  }
});

// Get all conversations for a prospect
prospectsRouter.get('/:id/conversations', authenticateToken, (req, res) => {
  try {
    const calls = db.prepare(`
      SELECT id, call_type, status, conversation, created_at, completed_at, outcome, duration_seconds
      FROM calls
      WHERE prospect_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id) as any[];

    // Parse conversations and extract message counts
    const conversationsWithDetails = calls.map(call => {
      let messageCount = 0;
      let messages = [];

      if (call.conversation) {
        try {
          const parsed = JSON.parse(call.conversation);
          if (Array.isArray(parsed)) {
            messages = parsed;
            messageCount = parsed.length;
          } else if (parsed.messages && Array.isArray(parsed.messages)) {
            messages = parsed.messages;
            messageCount = parsed.messages.length;
          }
        } catch (e) {
          console.error('Failed to parse conversation:', e);
        }
      }

      return {
        id: call.id,
        call_type: call.call_type,
        status: call.status,
        outcome: call.outcome,
        duration_seconds: call.duration_seconds,
        message_count: messageCount,
        messages: messages,
        created_at: call.created_at,
        completed_at: call.completed_at,
      };
    });

    res.json(conversationsWithDetails);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get prospect stats
prospectsRouter.get('/stats/summary', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'researched' THEN 1 ELSE 0 END) as researched,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        AVG(success_probability) as avg_probability
      FROM prospects
    `).get();

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
