const express = require('express');
const router = express.Router();

// Endpoint: Dodanie zadania do harmonogramu
router.post('/', (req, res) => {
  const { deviceId, day, time, amount } = req.body;
  // todo: logika zapisu do bazy danych
  res.status(201).send({ message: 'Schedule created successfully.' });
});

module.exports = router;
