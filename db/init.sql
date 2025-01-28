-- Tabela: Owners (właściciele)
CREATE TABLE owners (
    owner_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL, -- Unikalna nazwa użytkownika
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL, -- Hasło w postaci zahaszowanej
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Data rejestracji
);

-- Tabela: Devices (poidełka)
CREATE TABLE devices (
    device_id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES owners(owner_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Schedule (harmonogramy)
CREATE TABLE schedule (
    schedule_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    day VARCHAR(10) NOT NULL DEFAULT 'Monday', -- Dzień tygodnia
    time TIME NOT NULL,
    amount_ml INT NOT NULL CHECK (amount_ml > 0)
);

-- Tabela: DeviceStatus (stan urządzenia)
CREATE TABLE device_status (
    status_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    weight DECIMAL(10, 2) CHECK (weight >= 0), -- Waga
    button_state VARCHAR(50) NOT NULL, -- Stan przycisku (np. RELEASED/PRESSED)
    led_state VARCHAR(50) NOT NULL, -- Stan diody (np. ON/OFF)
    motor_state VARCHAR(50) NOT NULL, -- Stan silnika (np. ON/OFF)
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Czas ostatniej aktualizacji
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Czas ostatniej modyfikacji
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON device_status
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tabela: DeviceAlarms (zaplanowane alarmy)
CREATE TABLE device_alarms (
    alarm_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL, -- Czas alarmu
    target_weight DECIMAL(10, 2) DEFAULT 200.0 CHECK (target_weight > 0), -- Docelowa waga wody
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Data utworzenia alarmu
);

-- Tabela: ActionLogs (logi działania)
CREATE TABLE action_logs (
    log_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    amount_ml INT CHECK (amount_ml >= 0),
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dodanie indeksów dla optymalizacji
CREATE INDEX idx_device_status_timestamp ON device_status (timestamp);
CREATE INDEX idx_device_alarms_timestamp ON device_alarms (timestamp);
CREATE INDEX idx_action_logs_timestamp ON action_logs (timestamp);

-- Przykładowe dane testowe
-- Dodanie właścicieli
INSERT INTO owners (username, name, email, phone_number, password_hash)
VALUES 
('johndoe', 'John Doe', 'john.doe@example.com', '123456789', 'hashed_password_example'),
('janedoe', 'Jane Doe', 'jane.doe@example.com', '987654321', 'hashed_password_example_2');

-- Dodanie urządzeń
INSERT INTO devices (owner_id, name)
VALUES 
(1, 'Rex Water Dispenser'),
(1, 'Smart Water Dispenser'),
(2, 'Pet Water Fountain');

-- Dodanie harmonogramów
INSERT INTO schedule (device_id, time, amount_ml)
VALUES 
(1, 'Monday', '08:00:00', 500),
(1, 'Wednesday', '18:00:00', 500),
(2, 'Friday', '07:00:00', 400),
(3, 'Monday', '12:00:00', 600);

-- Dodanie stanów urządzeń
INSERT INTO device_status (device_id, weight, button_state, led_state, motor_state)
VALUES 
(1, 350.00, 'RELEASED', 'ON', 'OFF'),
(2, 250.00, 'PRESSED', 'OFF', 'ON'),
(3, 0.00, 'RELEASED', 'ON', 'OFF');

-- Dodanie alarmów
INSERT INTO device_alarms (device_id, timestamp, target_weight)
VALUES 
(1, '2025-01-27T10:00:00', 200.00),
(1, '2025-01-28T12:30:00', 250.00),
(2, '2025-01-29T14:00:00', 300.00),
(3, '2025-01-30T15:00:00', 350.00);

-- Dodanie logów akcji
INSERT INTO action_logs (device_id, action_type, amount_ml, description)
VALUES 
(1, 'fill_water', 500, 'Filled the bowl with 500 ml of water'),
(2, 'pour_water', 400, 'Poured 400 ml of water'),
(3, 'alert', NULL, 'Low water level detected'),
(1, 'reset_tare', NULL, 'Tare reset requested'),
(2, 'fill_water', 300, 'Filled the bowl with 300 ml of water');

ALTER USER postgres WITH PASSWORD 'poidelko123';
