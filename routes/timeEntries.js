const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all time entries for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const timeEntries = await db.query(
      `SELECT te.*, t.title as task_title, p.title as project_title 
       FROM time_entries te
       JOIN tasks t ON te.task_id = t.id
       JOIN projects p ON t.project_id = p.id
       WHERE te.user_id = ?
       ORDER BY te.start_time DESC`,
      [userId]
    );
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Get all time entries for a task
router.get('/task/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const timeEntries = await db.query(
      `SELECT te.*, u.name as user_name 
       FROM time_entries te
       JOIN users u ON te.user_id = u.id
       WHERE te.task_id = ?
       ORDER BY te.start_time DESC`,
      [taskId]
    );
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Get all time entries for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const timeEntries = await db.query(
      `SELECT te.*, t.title as task_title, u.name as user_name 
       FROM time_entries te
       JOIN tasks t ON te.task_id = t.id
       JOIN users u ON te.user_id = u.id
       WHERE t.project_id = ?
       ORDER BY te.start_time DESC`,
      [projectId]
    );
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Create a new time entry
router.post('/', async (req, res) => {
  try {
    const { task_id, user_id, start_time, end_time, duration, description, billable } = req.body;
    
    // Validate required fields
    if (!task_id || !user_id || !start_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Calculate duration if end_time is provided but duration is not
    let calculatedDuration = duration;
    if (end_time && !duration) {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      calculatedDuration = Math.round((endDate - startDate) / 60000); // Convert ms to minutes
    }
    
    const result = await db.query(
      `INSERT INTO time_entries (task_id, user_id, start_time, end_time, duration, description, billable)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [task_id, user_id, start_time, end_time, calculatedDuration, description, billable]
    );
    
    res.status(201).json({ 
      id: result.insertId,
      task_id,
      user_id,
      start_time,
      end_time,
      duration: calculatedDuration,
      description,
      billable
    });
  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

// Update a time entry
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { start_time, end_time, duration, description, billable } = req.body;
    
    // Calculate duration if end_time is provided but duration is not
    let calculatedDuration = duration;
    if (end_time && !duration && start_time) {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      calculatedDuration = Math.round((endDate - startDate) / 60000); // Convert ms to minutes
    }
    
    await db.query(
      `UPDATE time_entries 
       SET start_time = ?, end_time = ?, duration = ?, description = ?, billable = ?
       WHERE id = ?`,
      [start_time, end_time, calculatedDuration, description, billable, id]
    );
    
    res.json({ 
      id: parseInt(id),
      start_time,
      end_time,
      duration: calculatedDuration,
      description,
      billable
    });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// Delete a time entry
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM time_entries WHERE id = ?', [id]);
    res.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// Get time summary for a project
router.get('/summary/project/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const summary = await db.query(
      `SELECT 
         SUM(te.duration) as total_minutes,
         COUNT(DISTINCT te.user_id) as total_users,
         COUNT(DISTINCT te.task_id) as total_tasks
       FROM time_entries te
       JOIN tasks t ON te.task_id = t.id
       WHERE t.project_id = ?`,
      [projectId]
    );
    
    // Format the response
    const totalHours = Math.floor(summary[0].total_minutes / 60);
    const remainingMinutes = summary[0].total_minutes % 60;
    
    res.json({
      total_time: `${totalHours}h ${remainingMinutes}m`,
      total_minutes: summary[0].total_minutes,
      total_users: summary[0].total_users,
      total_tasks: summary[0].total_tasks
    });
  } catch (error) {
    console.error('Error fetching time summary:', error);
    res.status(500).json({ error: 'Failed to fetch time summary' });
  }
});

module.exports = router;
