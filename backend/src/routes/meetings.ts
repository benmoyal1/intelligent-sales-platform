import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { authenticateToken } from '../middleware/auth';

export const meetingsRouter = Router();

// Get all meetings
meetingsRouter.get('/', authenticateToken, (req, res) => {
  try {
    const meetings = db
      .prepare(
        `SELECT m.*, p.name as prospect_name, p.company, p.email, p.role
         FROM meetings m
         JOIN prospects p ON m.prospect_id = p.id
         ORDER BY m.scheduled_time ASC`
      )
      .all();
    res.json(meetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Get single meeting
meetingsRouter.get('/:id', authenticateToken, (req, res) => {
  try {
    const meeting = db
      .prepare(
        `SELECT m.*, p.name as prospect_name, p.company, p.email, p.role
         FROM meetings m
         JOIN prospects p ON m.prospect_id = p.id
         WHERE m.id = ?`
      )
      .get(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(meeting);
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// Create new meeting
meetingsRouter.post('/', authenticateToken, (req, res) => {
  try {
    const {
      prospect_id,
      call_id,
      scheduled_time,
      duration_minutes,
      meeting_type,
      account_manager_name,
      account_manager_email,
      notes,
    } = req.body;

    if (!prospect_id || !scheduled_time) {
      return res.status(400).json({ error: 'Prospect ID and scheduled time are required' });
    }

    // Verify prospect exists
    const prospect = db.prepare('SELECT * FROM prospects WHERE id = ?').get(prospect_id);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    const meetingId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO meetings (
        id, prospect_id, call_id, scheduled_time, duration_minutes,
        meeting_type, status, account_manager_name, account_manager_email,
        notes, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`
    ).run(
      meetingId,
      prospect_id,
      call_id || null,
      scheduled_time,
      duration_minutes || 30,
      meeting_type || 'demo',
      account_manager_name || 'Account Manager',
      account_manager_email || 'am@alta.com',
      notes || null,
      now
    );

    // Update call record if call_id is provided
    if (call_id) {
      db.prepare('UPDATE calls SET meeting_booked = 1 WHERE id = ?').run(call_id);
    }

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId);
    res.json(meeting);
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Update meeting status
meetingsRouter.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    db.prepare('UPDATE meetings SET status = ? WHERE id = ?').run(status, req.params.id);

    const updatedMeeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id);
    res.json(updatedMeeting);
  } catch (error) {
    console.error('Update meeting status error:', error);
    res.status(500).json({ error: 'Failed to update meeting status' });
  }
});

// Get meeting stats
meetingsRouter.get('/stats/summary', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_meetings,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as no_shows
      FROM meetings
    `).get();

    res.json(stats);
  } catch (error) {
    console.error('Get meeting stats error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting stats' });
  }
});
