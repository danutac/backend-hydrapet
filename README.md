# **HydraPet Backend**

---

## **Konfiguracja projektu**

1. **Klonowanie repozytorium**
   Aby rozpocząć, sklonuj repozytorium projektu:
   ```bash
   git clone https://github.com/danutac/backend-hydrapet.git
   cd backend-hydrapet
   ```

2. **Uruchaminaie projektu**
Sprawdź plik **docker-compose.yml** i dostosuj zmienne środowiskowe, jeśli to konieczne:
```bash
POSTGRES_USER: postgres
POSTGRES_PASSWORD: poidelko123
POSTGRES_DB: yourdatabase
```

Żeby uruchomić:
```bash
docker-compose up --build
```

Endpoint testowy dostępny jest pod adresem: http://localhost:3000

## Endpointy API

### 1. Endpointy uwierzytelniania (dla aplikacji mobilnej)

#### POST /auth/register
Rejestracja nowego użytkownika.
**Body**:
- `username`
- `name`
- `email`
- `phone_number`
- `password`

#### POST /auth/login
Logowanie użytkownika.
**Body**:
- `email`
- `password`

#### GET /auth/me
Pobieranie danych zalogowanego użytkownika.
**Nagłówek**:
- `Authorization: Bearer <JWT_TOKEN>`

### 2. Endpointy dla urządzeń (ESP32 i aplikacja mobilna)

#### GET /devices
Pobiera listę urządzeń przypisanych do zalogowanego użytkownika.
**Nagłówek**:
- `Authorization: Bearer <JWT_TOKEN>`

#### GET /devices/:id/status
Pobiera status konkretnego urządzenia.
**Parametr URL**:
- `:id` - ID urządzenia.

**Nagłówek**:
- `Authorization: Bearer <JWT_TOKEN>`

### 3. Endpointy dla harmonogramów (aplikacja mobilna)

#### POST /schedule
Dodaje harmonogram działania dla urządzenia.
**Body**:
- `deviceId`
- `day`
- `time`
- `amount`

**Nagłówek**:
- `Authorization: Bearer <JWT_TOKEN>`

#### GET /schedule/:deviceId
Pobiera harmonogram działania dla konkretnego urządzenia.
**Parametr URL**:
- `:deviceId` - ID urządzenia.

**Nagłówek**:
- `Authorization: Bearer <JWT_TOKEN>`

### 4. Komunikacja MQTT (ESP32 i aplikacja mobilna)

Backend subskrybuje następujące tematy MQTT:
- `device/+/command`: Komunikaty z poleceniami dla urządzeń.
- `device/+/status`: Komunikaty wysyłane przez urządzenie do backendu z informacjami o statusie.
- `device/+/schedule`: Harmonogramy działania urządzenia.

Aby przetestować publikację na tematy MQTT, można użyć mosquitto_pub:
```sh
mosquitto_pub -h <MQTT_BROKER_HOST> -t "device/1/command" -m '{"command": "START"}'


