const express = require('express');
const pool = require('../config/db');
const { requestDeviceTime, publishSetWater, requestWaterState, deleteAlarm, pourWater, resetTare, publishSetTime } = require('../config/mqtt');
const authenticate = require('../middleware/authMiddleware'); 

const router = express.Router();

// Pobierz listę urządzeń dla zalogowanego użytkownika
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM devices WHERE owner_id = $1', [req.user.owner_id]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving devices:', err);
    res.status(500).send('Error retrieving devices');
  }
});

// Dodaj nowe urządzenie (przypisane do zalogowanego użytkownika)
router.post('/', authenticate, async (req, res) => {
  const { name } = req.body; // Nazwa urządzenia wysłana w body żądania

  try {
    // Dodanie nowego urządzenia do bazy danych
    const result = await pool.query(
      'INSERT INTO devices (owner_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.owner_id, name]
    );

    // Zwrócenie odpowiedzi z dodanym urządzeniem
    res.status(201).json({ message: 'Device added successfully', device: result.rows[0] });
  } catch (err) {
    console.error('Error adding device:', err);
    res.status(500).send({ error: 'Error adding device' });
  }
});

// Endpoint: Pobranie szczegółów urządzenia
router.get('/:id/details', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    const result = await pool.query(
      'SELECT * FROM devices WHERE device_id = $1',
      [req.params.id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error retrieving device details:', err);
    res.status(500).send('Error retrieving device details');
  }
});

// Pobierz status urządzenia (z weryfikacją właściciela)
router.get('/:id/status', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

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

// Endpoint: Statystyki użycia urządzenia
router.get('/:id/statistics', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    const result = await pool.query(
      `SELECT
         COUNT(*) AS total_actions,
         SUM(amount_ml) AS total_water_dispensed,
         MAX(timestamp) AS last_action_time
       FROM action_logs
       WHERE device_id = $1`,
      [req.params.id]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error retrieving device statistics:', err);
    res.status(500).send('Error retrieving device statistics');
  }
});

// Aktualizacja czasu urządzenia
router.post('/:id/set-time', authenticate, async (req, res) => {
  const { timestamp } = req.body;

  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    const topic = `hydrapet${req.params.id}/update/set/time`;
    publishSetTime(req.params.id, timestamp);

    res.status(200).send('Time update sent successfully');
  } catch (err) {
    console.error('Error updating time:', err);
    res.status(500).send('Error updating time');
  }
});

// Ustawienie docelowej wagi wody
router.post('/:id/set-water', authenticate, async (req, res) => {
  const { target_weight } = req.body;

  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    publishSetWater(req.params.id, target_weight);

    res.status(200).send(`Water target weight set to ${target_weight} grams`);
  } catch (err) {
    console.error('Error setting water target weight:', err);
    res.status(500).send('Error setting water target weight');
  }
});

// Endpoint: Pobranie aktualnej wagi wody z urządzenia
router.get('/:id/get-water', authenticate, async (req, res) => {
  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query(
      'SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2',
      [req.params.id, req.user.owner_id]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    // Publikowanie żądania na MQTT
    requestWaterState(req.params.id);

    // Pobranie aktualnej wagi wody z bazy danych
    const result = await pool.query(
      'SELECT weight, updated_at FROM device_status WHERE device_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('No water state data available for this device');
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error retrieving water state:', err);
    res.status(500).send('Error retrieving water state');
  }
});

// Endpoint: Rozpoczęcie nalewania wody na urządzeniu
router.post('/:id/pour-water', authenticate, async (req, res) => {
  const { target_weight } = req.body;

  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query(
      'SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2',
      [req.params.id, req.user.owner_id]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    // Publikowanie żądania na MQTT
    pourWater(req.params.id, target_weight);

    // Opcjonalne logowanie do tabeli action_logs
    await pool.query(
      `INSERT INTO action_logs (device_id, action_type, description, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [req.params.id, 'pour_water', `Requested target weight: ${target_weight} grams`]
    );

    res.status(200).send(`Pour water request sent successfully for target weight: ${target_weight} grams`);
  } catch (err) {
    console.error('Error sending pour water request:', err);
    res.status(500).send('Error sending pour water request');
  }
});

// Pobierz logi działania urządzenia (z weryfikacją właściciela)
router.get('/:id/logs', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

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

// Pobranie aktualnego czasu urządzenia
router.get('/:id/get-time', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    requestDeviceTime(req.params.id);

    res.status(200).send('Time request sent successfully');
  } catch (err) {
    console.error('Error requesting time:', err);
    res.status(500).send('Error requesting time');
  }
});

// Pobranie logów żądań czasu
router.get('/:id/time-logs', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query('SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2', [req.params.id, req.user.owner_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    const result = await pool.query(
      `SELECT * FROM action_logs
       WHERE device_id = $1 AND action_type = $2
       ORDER BY timestamp DESC`,
      [req.params.id, 'get_time']
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving time logs:', err);
    res.status(500).send('Error retrieving time logs');
  }
});

// Endpoint: Usunięcie alarmu z urządzenia
router.delete('/:id/delete-alarm', authenticate, async (req, res) => {
  const { timestamp } = req.body;

  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query(
      'SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2',
      [req.params.id, req.user.owner_id]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    // Publikowanie żądania na MQTT
    deleteAlarm(req.params.id, timestamp);

    // Usuwanie alarmu z bazy danych (jeśli przechowujemy lokalnie)
    const result = await pool.query(
      'DELETE FROM device_alarms WHERE device_id = $1 AND timestamp = $2 RETURNING *',
      [req.params.id, timestamp]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Alarm not found');
    }

    res.status(200).send({ message: 'Alarm deleted successfully', deletedAlarm: result.rows[0] });
  } catch (err) {
    console.error('Error deleting alarm:', err);
    res.status(500).send('Error deleting alarm');
  }
});

// Endpoint: Resetowanie wagi urządzenia (tare)
router.post('/:id/set-tare', authenticate, async (req, res) => {
  try {
    // Sprawdzenie, czy urządzenie należy do zalogowanego użytkownika
    const deviceCheck = await pool.query(
      'SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2',
      [req.params.id, req.user.owner_id]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    // Publikowanie żądania na MQTT
    resetTare(req.params.id);

    // Opcjonalne logowanie do tabeli action_logs
    await pool.query(
      `INSERT INTO action_logs (device_id, action_type, description, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [req.params.id, 'reset_tare', 'Tare reset requested']
    );

    res.status(200).send('Tare reset request sent successfully');
  } catch (err) {
    console.error('Error sending tare reset request:', err);
    res.status(500).send('Error sending tare reset request');
  }
});

// Pobierz poziom wody z bazy danych
router.get('/:id/water-tank-level', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query(
      'SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2',
      [req.params.id, req.user.owner_id]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    const result = await pool.query(
      'SELECT water_available, updated_at FROM device_status WHERE device_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('No water tank level data available for this device');
    }

    const waterLevelStatus = result.rows[0].water_available === 0 ? 'Below 30%' : 'Water tank is full';
    res.status(200).json({ status: waterLevelStatus, updated_at: result.rows[0].updated_at });
  } catch (err) {
    console.error('Error retrieving water tank level:', err);
    res.status(500).send('Error retrieving water tank level');
  }
});

// Pobierz logi krytycznych alertów dla urządzenia
router.get('/:id/water-tank-alerts', authenticate, async (req, res) => {
  try {
    const deviceCheck = await pool.query(
      'SELECT * FROM devices WHERE device_id = $1 AND owner_id = $2',
      [req.params.id, req.user.owner_id]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(403).send('You do not have access to this device');
    }

    const result = await pool.query(
      `SELECT description, timestamp
       FROM action_logs
       WHERE device_id = $1 AND action_type = 'alert'
       ORDER BY timestamp DESC`,
      [req.params.id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error retrieving water tank alerts:', err);
    res.status(500).send('Error retrieving water tank alerts');
  }
});


module.exports = router;
