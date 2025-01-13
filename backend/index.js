const express = require('express');
const mqtt = require('mqtt');
const { Pool } = require('pg');

// Konfiguracja aplikacji Express
const app = express();
app.use(express.json());

// Połączenie z PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test połączenia z bazą danych
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to PostgreSQL');
  }
});

// Konfiguracja klienta MQTT
const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`);

// Obsługa zdarzeń MQTT
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('hydration/status', (err) => {
    if (!err) {
      console.log('Subscribed to hydration/status');
    }
  });
});

mqttClient.on('message', (topic, message) => {
  console.log(`Message received on topic ${topic}: ${message.toString()}`);
  // Tu będzie logika zapisu danych do bazy danych
});

// Endpoint testowy
app.get('/', (req, res) => {
  res.send('HydraPet Backend is running!');
});

// Start serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
