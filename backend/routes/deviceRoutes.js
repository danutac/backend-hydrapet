const express = require('express');
const router = express.Router();
const mqttClient = require('../config/mqtt');

// Endpoint: Wysyłanie polecenia do urządzenia
router.post('/command', (req, res) => {
  const { deviceId, amount } = req.body;
  mqttClient.publish(`device/${deviceId}/command`, JSON.stringify({ amount }));
  res.status(200).send({ message: 'Command sent to device.' });
});

// Endpoint: Odbieranie potwierdzenia od urządzenia
router.get('/confirmation', (req, res) => {
  // todo: logika z bazą danych. Na razie zwracamy mock:
  res.status(200).send({
    deviceId: '12345',
    status: 'success',
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: Pobieranie statusu urządzenia
router.get('/status', (req, res) => {
  // todo: logika z bazą danych. Na razie zwracamy mock:
  res.status(200).send({
    deviceId: '12345',
    status: 'ok',
    lastUpdate: new Date().toISOString(),
    errors: [],
  });
});

module.exports = router;
