
-- Tabela: Owners (właściciele)
CREATE TABLE owners (
    owner_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20)
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

-- Tabela: DeviceStatus (stan urządzenia) - info o urzadzeniu
CREATE TABLE device_status (
    status_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    water_available BOOLEAN NOT NULL,
    bowl_weight DECIMAL(10, 2) CHECK (bowl_weight >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: ActionLogs (logi działania) - info o dzialaniu (nalewaniu wody)
CREATE TABLE action_logs (
    log_id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    amount_ml INT CHECK (amount_ml >= 0),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE action_logs ADD COLUMN description TEXT;

-- Dodanie indeksów dla optymalizacji
CREATE INDEX idx_device_status_updated_at ON device_status (updated_at);
CREATE INDEX idx_action_logs_timestamp ON action_logs (timestamp);

-- Przykładowe dane testowe
-- Dodanie właściciela
INSERT INTO owners (name, email, phone_number)
VALUES ('John Doe', 'john.doe@example.com', '123456789');

-- Dodanie urządzenia
INSERT INTO devices (owner_id, name)
VALUES (1, 'Rex Water Dispenser');

-- Dodanie harmonogramu
INSERT INTO schedule (device_id, time, amount_ml)
VALUES (1, '08:00:00', 500),
       (1, '18:00:00', 500);

-- Dodanie stanu urządzenia
INSERT INTO device_status (device_id, water_available, bowl_weight)
VALUES (1, TRUE, 350.00);

-- Dodanie logu akcji
INSERT INTO action_logs (device_id, action_type, amount_ml)
VALUES (1, 'fill_water', 500);

ALTER USER postgres WITH PASSWORD 'poidelko123';