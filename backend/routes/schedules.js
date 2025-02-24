const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all schedules
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, c.name AS client_name FROM schedules s JOIN clients c ON s.client_id = c.id'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a schedule
router.post('/', async (req, res) => {
  const { client_id, appointment_time, end_time, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO schedules (client_id, appointment_time, end_time, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [client_id, appointment_time, end_time || null, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in POST /api/schedules:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;