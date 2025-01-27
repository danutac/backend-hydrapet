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
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Czas ostatniej aktualizacji
);

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
-- Dodanie właściciela
INSERT INTO owners (username, name, email, phone_number, password_hash)
VALUES 
('johndoe', 'John Doe', 'john.doe@example.com', '123456789', 'hashed_password_example');

-- Dodanie urządzenia
INSERT INTO devices (owner_id, name)
VALUES (1, 'Rex Water Dispenser');

-- Dodanie harmonogramu
INSERT INTO schedule (device_id, time, amount_ml)
VALUES (1, '08:00:00', 500),
       (1, '18:00:00', 500);

-- Dodanie stanu urządzenia
INSERT INTO device_status (device_id, weight, button_state, led_state, motor_state)
VALUES (1, 350.00, 'RELEASED', 'ON', 'OFF');

-- Dodanie alarmu
INSERT INTO device_alarms (device_id, timestamp, target_weight)
VALUES 
(1, '2025-01-27T10:00:00', 200.00),
(1, '2025-01-28T12:30:00', 250.00);

-- Dodanie logu akcji
INSERT INTO action_logs (device_id, action_type, amount_ml, description)
VALUES (1, 'fill_water', 500, 'Filled the bowl with 500 ml of water');

ALTER USER postgres WITH PASSWORD 'poidelko123';
