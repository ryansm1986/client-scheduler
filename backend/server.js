const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const clientRoutes = require('./routes/clients');
const scheduleRoutes = require('./routes/schedules');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/clients', clientRoutes);
app.use('/api/schedules', scheduleRoutes);

app.delete('/api/schedules/:id', async (req, res) => {
  const id = parseInt(req.params.id); // Ensure id is an integer
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid appointment ID' });
  }

  try {
    const result = await pool.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully', appointment: result.rows[0] });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/schedules/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid appointment ID' });
  }

  const { appointment_time, end_time, client_id } = req.body; // Include client_id in destructuring
  if (!appointment_time) {
    return res.status(400).json({ error: 'Appointment time is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE schedules SET appointment_time = $1, end_time = $2, client_id = $3 WHERE id = $4 RETURNING *',
      [appointment_time, end_time || null, client_id || null, id] // Update client_id if provided
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment updated successfully', appointment: result.rows[0] });
  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});