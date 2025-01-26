const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/authMiddleware'); // Import middleware

const router = express.Router();

// Pobierz listę urządzeń dla zalogowanego użytkownika
router.get('/', authenticate, async (req, res) => {
  try {
    // Pobranie urządzeń tylko dla zalogowanego użytkownika
    const result = await pool.query('SELECT * FROM devices WHERE owner_id = $1', [req.user.owner_id]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving devices:', err);
    res.status(500).send('Error retrieving devices');
  }
});

// Pobierz status urządzenia (z weryfikacją właściciela)
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    // Pobranie statusu urządzenia
    const result = await pool.query(
      'SELECT * FROM device_status WHERE device_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.params.id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error retrieving device status:', err);
    res.status(500).send('Error retrieving device status');
  }
});

// Dodaj harmonogram dla urządzenia (z weryfikacją właściciela)
router.post('/:id/schedule', authenticate, async (req, res) => {
  const { time, amount_ml } = req.body;

  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    // Dodanie harmonogramu
    await pool.query('INSERT INTO schedule (device_id, time, amount_ml) VALUES ($1, $2, $3)', [req.params.id, time, amount_ml]);
    res.status(201).send('Schedule added successfully');
  } catch (err) {
    console.error('Error adding schedule:', err);
    res.status(500).send('Error adding schedule');
  }
});

// Pobierz logi działania urządzenia (z weryfikacją właściciela)
router.get('/:id/logs', authenticate, async (req, res) => {
  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    // Pobranie logów działania urządzenia
    const result = await pool.query(
      'SELECT * FROM action_logs WHERE device_id = $1 ORDER BY timestamp DESC',
      [req.params.id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving action logs:', err);
    res.status(500).send('Error retrieving action logs');
  }
});

module.exports = router;
