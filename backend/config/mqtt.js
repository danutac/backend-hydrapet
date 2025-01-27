const mqtt = require('mqtt');
const pool = require('./db'); // Import połączenia do bazy danych

// Połączenie z brokerem MQTT
const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');

  // Subskrypcja tematów MQTT
  mqttClient.subscribe('hydrapet+/update/get/status', (err) => {
    if (!err) console.log('Subscribed to get/status');
  });

  mqttClient.subscribe('hydrapet+/update/get/alarms', (err) => {
    if (!err) console.log('Subscribed to get/alarms');
  });

  mqttClient.subscribe('hydrapet+/update/set/time', (err) => {
    if (!err) console.log('Subscribed to set/time');
  });

  mqttClient.subscribe('hydrapet+/update/get/time', (err) => {
    if (!err) console.log('Subscribed to get/time');
  });

  mqttClient.subscribe('hydrapet+/update/set/water', (err) => {
    if (!err) console.log('Subscribed to set/water');
  });

  mqttClient.subscribe('hydrapet+/update/get/water', (err) => {
    if (!err) console.log('Subscribed to get/water');
  });

  mqttClient.subscribe('hydrapet+/hydrapetinfo/watertanklevel', (err) => {
    if (!err) console.log('Subscribed to watertanklevel');
  });

  mqttClient.subscribe('hydrapet+/hydrapetinfo/watertank', (err) => {
    if (!err) console.log('Subscribed to watertank');
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const parsedMessage = JSON.parse(message.toString());
    console.log(`Message received on topic ${topic}:`, parsedMessage);

    if (topic.includes('/update/get/status')) {
      const serialNumber = topic.split('/')[0].replace('hydrapet', '');
      await pool.query(
        `INSERT INTO device_status (device_id, weight, button_state, led_state, motor_state, timestamp)
         VALUES (
           (SELECT device_id FROM devices WHERE name = $1),
           $2, $3, $4, $5, $6
         )`,
        [
          serialNumber,
          parsedMessage.weight,
          parsedMessage.button_state,
          parsedMessage.led_state,
          parsedMessage.motor_state,
          parsedMessage.timestamp,
        ]
      );
      console.log('Device status updated in database');
    } else if (topic.includes('/update/get/time')) {
      console.log('Received current time from device:', parsedMessage.current_time);

      // Zapisanie czasu do tabeli action_logs
      const serialNumber = topic.split('/')[0].replace('hydrapet', '');
      await pool.query(
        `INSERT INTO action_logs (device_id, action_type, description, timestamp)
         VALUES (
           (SELECT device_id FROM devices WHERE name = $1),
           $2, $3, NOW()
         )`,
        [
          serialNumber,
          'get_time', // Typ akcji
          `Current time: ${parsedMessage.current_time}`, // Opis akcji
        ]
      );
      console.log('Time request logged in database');
    } else if (topic.includes('/update/get/alarms')) {
      const serialNumber = topic.split('/')[0].replace('hydrapet', '');
      for (const alarm of parsedMessage.alarms) {
        await pool.query(
          `INSERT INTO device_alarms (device_id, timestamp, target_weight)
           VALUES (
             (SELECT device_id FROM devices WHERE name = $1),
             $2, $3
           )
           ON CONFLICT (device_id, timestamp) DO NOTHING`,
          [serialNumber, alarm.timestamp, alarm.target_weight]
        );
      }
      console.log('Device alarms updated in database');
    } else if (topic.includes('/update/set/time')) {
      console.log(`Time set successfully for topic ${topic}`);
    } else if (topic.includes('/update/set/water')) {
      console.log(`Water target weight set for topic ${topic}`);
    } else if (topic.includes('/update/get/water')) {
      console.log(`Received water state from device: ${parsedMessage.water_state}`);
      
      const serialNumber = topic.split('/')[0].replace('hydrapet', '');
      await pool.query(
        `INSERT INTO device_status (device_id, weight, updated_at)
         VALUES (
           (SELECT device_id FROM devices WHERE name = $1),
           $2, NOW()
         )
         ON CONFLICT (device_id) DO UPDATE SET weight = EXCLUDED.weight, updated_at = EXCLUDED.updated_at`,
        [serialNumber, parsedMessage.water_state]
      );
      console.log('Water state updated in database');
    } else if (topic.includes('/hydrapetinfo/watertanklevel')) {
      // Obsługa poziomu wody
      const waterLevelState = payload === 'Below 30%' ? 0 : 1;
      await pool.query(
        `UPDATE device_status
         SET water_available = $1, updated_at = NOW()
         WHERE device_id = (SELECT device_id FROM devices WHERE name = $2)`,
        [waterLevelState, serialNumber]
      );
      console.log('Water tank level updated in database:', payload);
    } else if (topic.includes('/hydrapetinfo/watertank')) {
      // Obsługa krytycznych alertów
      if (payload === 'empty') {
        await pool.query(
          `INSERT INTO action_logs (device_id, action_type, description, timestamp)
           VALUES (
             (SELECT device_id FROM devices WHERE name = $1),
             $2, $3, NOW()
           )`,
          [serialNumber, 'alert', 'Water tank empty']
        );
        console.log('Critical alert logged: Water tank empty');
      }
    }
  } catch (err) {
    console.error('Error processing MQTT message:', err);
  }
});

// Funkcja publikująca żądanie czasu na temat `update/get/time`
function requestDeviceTime(deviceId) {
  const topic = `hydrapet${deviceId}/update/get/time`;
  mqttClient.publish(topic, '', (err) => {
    if (err) {
      console.error(`Error requesting time from device ${deviceId}:`, err);
    } else {
      console.log(`Requested time from device ${deviceId} on topic ${topic}`);
    }
  });
}

// Funkcja publikująca docelową wagę wody na temat `update/set/water`
function publishSetWater(deviceId, targetWeight) {
  const topic = `hydrapet${deviceId}/update/set/water`;
  const payload = `${targetWeight}`; // Payload w postaci tekstowej liczby

  mqttClient.publish(topic, payload, (err) => {
    if (err) {
      console.error(`Error publishing to ${topic}:`, err);
    } else {
      console.log(`Published to ${topic}: ${payload}`);
    }
  });
}

// Funkcja publikująca żądanie wagi wody
function requestWaterState(deviceId) {
  const topic = `hydrapet${deviceId}/update/get/water`;
  mqttClient.publish(topic, '', (err) => {
    if (err) {
      console.error(`Error requesting water state from device ${deviceId}:`, err);
    } else {
      console.log(`Requested water state from device ${deviceId} on topic ${topic}`);
    }
  });
}

// Funkcja publikująca żądanie dolewania wody na temat `update/put/pourwater`
function pourWater(deviceId, targetWeight) {
  const topic = `hydrapet${deviceId}/update/put/pourwater`;
  const payload = JSON.stringify({ target_weight: targetWeight });

  mqttClient.publish(topic, payload, (err) => {
    if (err) {
      console.error(`Error publishing to ${topic}:`, err);
    } else {
      console.log(`Published pour water request to ${topic}:`, payload);
    }
  });
}

// Funkcja publikująca czas na temat `update/set/time`
function publishSetTime(deviceId, timestamp) {
  const topic = `hydrapet${deviceId}/update/set/time`;
  const payload = JSON.stringify({ timestamp });

  mqttClient.publish(topic, payload, (err) => {
    if (err) {
      console.error(`Error publishing to ${topic}:`, err);
    } else {
      console.log(`Published to ${topic}: ${payload}`);
    }
  });
}

// Funkcja publikująca żądanie usunięcia alarmu na temat `update/del/alarm`
function deleteAlarm(deviceId, timestamp) {
  const topic = `hydrapet${deviceId}/update/del/alarm`;
  const payload = JSON.stringify({ timestamp });

  mqttClient.publish(topic, payload, (err) => {
    if (err) {
      console.error(`Error publishing to ${topic}:`, err);
    } else {
      console.log(`Published delete alarm request to ${topic}:`, payload);
    }
  });
}

// Funkcja publikująca żądanie resetowania wagi na temat `update/set/tare`
function resetTare(deviceId) {
  const topic = `hydrapet${deviceId}/update/set/tare`;
  const payload = 'tare'; // Payload może być dowolną wartością

  mqttClient.publish(topic, payload, (err) => {
    if (err) {
      console.error(`Error publishing to ${topic}:`, err);
    } else {
      console.log(`Published tare request to ${topic}: ${payload}`);
    }
  });
}

module.exports = {
  mqttClient,
  requestDeviceTime,
  publishSetTime,
  publishSetWater,
  requestWaterState,
  deleteAlarm,
  pourWater,
  resetTare,
};
