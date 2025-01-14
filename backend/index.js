const express = require('express');
const deviceRoutes = require('./routes/deviceRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
//const userRoutes = require('./routes/userRoutes');
const pool = require('./config/db');
const mqttClient = require('./config/mqtt');

// Konfiguracja aplikacji Express
const app = express();
app.use(express.json());

// Użycie tras
app.use('/device', deviceRoutes);
app.use('/schedule', scheduleRoutes);
//app.use('/user', userRoutes);

// Test połączenia z bazą danych
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// Obsługa zdarzeń MQTT
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');

  // Subskrypcja tematów
  mqttClient.subscribe('device/+/command', (err) => {
    if (!err) console.log('Subscribed to device/+/command');
  });

  mqttClient.subscribe('device/+/status', (err) => {
    if (!err) console.log('Subscribed to device/+/status');
  });

  mqttClient.subscribe('device/+/schedule', (err) => {
    if (!err) console.log('Subscribed to device/+/schedule');
  });
});

// Obsługa wiadomości MQTT
mqttClient.on('message', (topic, message) => {
  const parsedMessage = JSON.parse(message.toString());
  console.log(`Message received on topic ${topic}:`, parsedMessage);

  if (topic.includes('/command')) {
    deviceCommandData.push({ topic, ...parsedMessage });
  } else if (topic.includes('/status')) {
    deviceStatusData.push({ topic, ...parsedMessage });
  } else if (topic.includes('/schedule')) {
    scheduleData.push({ topic, ...parsedMessage });
  }
});

// Endpoint testowy
app.get('/', (req, res) => {
  res.send('HydraPet Backend is running!');
});

// Endpoint testowy dla `device/command`
app.post('/device/command', (req, res) => {
  const { deviceId, command } = req.body;
  const topic = `device/${deviceId}/command`;
  mqttClient.publish(topic, JSON.stringify({ command }));
  res.status(200).send({ message: 'Command published', topic, command });
});

app.get('/device/command', (req, res) => {
  res.status(200).send(deviceCommandData);
});

// Endpoint testowy dla `device/status`
app.post('/device/status', (req, res) => {
  const { deviceId, status } = req.body;
  const topic = `device/${deviceId}/status`;
  mqttClient.publish(topic, JSON.stringify({ status }));
  res.status(200).send({ message: 'Status published', topic, status });
});

app.get('/device/status', (req, res) => {
  res.status(200).send(deviceStatusData);
});

// Endpoint testowy dla `schedule`
app.post('/schedule', (req, res) => {
  const { deviceId, schedule } = req.body;
  const topic = `device/${deviceId}/schedule`;
  mqttClient.publish(topic, JSON.stringify({ schedule }));
  res.status(200).send({ message: 'Schedule published', topic, schedule });
});

app.get('/schedule', (req, res) => {
  res.status(200).send(scheduleData);
});

// Start serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
