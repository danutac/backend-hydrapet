const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/authMiddleware'); // Import middleware

const router = express.Router();

// Endpoint: Dodanie zadania do harmonogramu
router.post('/', authenticate, async (req, res) => {
  const { deviceId, day, time, amount } = req.body;

  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [deviceId, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send({ error: 'You do not have access to this device.' });
    }

    // Dodanie harmonogramu do bazy danych
    await pool.query(
      'INSERT INTO schedule (device_id, day, time, amount_ml) VALUES ($1, $2, $3, $4)',
      [deviceId, day, time, amount]
    );

    res.status(201).send({ message: 'Schedule created successfully.' });
  } catch (err) {
    console.error('Error adding schedule:', err);
    res.status(500).send({ error: 'Error adding schedule.' });
  }
});

// Endpoint: Pobranie harmonogramu dla urządzenia
router.get('/:deviceId', authenticate, async (req, res) => {
  const { deviceId } = req.params;

  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [deviceId, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send({ error: 'You do not have access to this device.' });
    }

    // Pobranie harmonogramu z bazy danych
    const result = await pool.query(
      'SELECT * FROM schedule WHERE device_id = $1 ORDER BY day, time',
      [deviceId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving schedule:', err);
    res.status(500).send({ error: 'Error retrieving schedule.' });
  }
});

// Endpoint: Usunięcie zadania z harmonogramu
router.delete('/:scheduleId', authenticate, async (req, res) => {
  const { scheduleId } = req.params;

  try {
    // Sprawdzenie, czy harmonogram należy do urządzenia użytkownika
    const scheduleCheck = await pool.query(
      `SELECT s.schedule_id
       FROM schedule s
       JOIN devices d ON s.device_id = d.device_id
       WHERE s.schedule_id = $1 AND d.owner_id = $2`,
      [scheduleId, req.user.owner_id]
    );

    if (scheduleCheck.rows.length === 0) {
      return res.status(403).send({ error: 'You do not have access to this schedule.' });
    }

    // Usunięcie zadania z harmonogramu
    await pool.query('DELETE FROM schedule WHERE schedule_id = $1', [scheduleId]);

    res.status(200).send({ message: 'Schedule deleted successfully.' });
  } catch (err) {
    console.error('Error deleting schedule:', err);
    res.status(500).send({ error: 'Error deleting schedule.' });
  }
});

// Wyślij harmonogram do urządzenia
router.post('/:deviceId/send-schedule', authenticate, async (req, res) => {
  const { deviceId } = req.params;

  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [deviceId, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send({ error: 'You do not have access to this device.' });
    }

    const schedule = await pool.query(
      'SELECT day, time, amount_ml FROM schedule WHERE device_id = $1 ORDER BY day, time',
      [deviceId]
    );

    const topic = `hydrapet${deviceId}/update/set/schedule`;
    mqttClient.publish(topic, JSON.stringify({ schedule: schedule.rows }));

    res.status(200).send({ message: 'Schedule sent to device successfully.' });
  } catch (err) {
    console.error('Error sending schedule:', err);
    res.status(500).send({ error: 'Error sending schedule.' });
  }
});


module.exports = router;
