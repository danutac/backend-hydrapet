const express = require('express');
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const mqttClient = require('./config/mqtt');

const app = express();
app.use(express.json());

// Rejestracja tras
app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);
app.use('/schedule', scheduleRoutes);

// Obsługa MQTT
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
});

// Uruchomienie serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
