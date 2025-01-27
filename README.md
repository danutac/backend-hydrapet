# **HydraPet Backend**

## **Spis treści**
1. [Konfiguracja projektu] (#konfiguracja)
2. [Autoryzacja](#autoryzacja)
3. [Endpointy urządzeń](#endpointy-urządzeń)
    - [Pobierz listę urządzeń](#pobierz-listę-urządzeń)
    - [Pobierz status urządzenia](#pobierz-status-urządzenia)
4. [Funkcjonalności MQTT](#funkcjonalności-mqtt)
    - [Ustawienie czasu urządzenia](#ustawienie-czasu-urządzenia)
    - [Pobranie aktualnego czasu urządzenia](#pobranie-aktualnego-czasu-urządzenia)
    - [Ustawienie docelowej wagi wody](#ustawienie-docelowej-wagi-wody)
    - [Pobranie aktualnej wagi wody](#pobranie-aktualnej-wagi-wody)
    - [Usunięcie alarmu](#usunięcie-alarmu)
    - [Nalewanie wody](#nalewanie-wody)
    - [Resetowanie tary](#resetowanie-tary)


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
---

## **Autoryzacja**
Wszystkie endpointy wymagają autoryzacji. Należy dodać nagłówek:
```
Authorization: Bearer <JWT_TOKEN>
```

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
---
### Przydatne komendy

#### Usunięcie woluminów i ponowne budowanie:
```sh
docker-compose down -v
docker-compose up --build
```

#### Dostęp do bazy danych PostgreSQL w kontenerze:
```sh
docker exec -it backend-hydrapet-db-1 psql -U postgres
```

#### Sprawdzenie czy tabele załadowały się poprawnie:
```sh 
\dt
```
#### Ręczne załadowanie skryptu
```sh 
docker cp db/init.sql backend-hydrapet-db-1:/init.sql 
docker exec -it backend-hydrapet-db-1 psql -U postgres
\i /init.sql
\dt
```
## **Endpointy urządzeń**

### **1. Pobierz listę urządzeń**
**GET /devices**  
Zwraca listę urządzeń przypisanych do zalogowanego użytkownika.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Odpowiedź:**
```json
[
    {
        "device_id": 12345,
        "owner_id": 1,
        "name": "HydraPet Dispenser",
        "created_at": "2025-01-01T10:00:00"
    }
]
```

---

### **2. Pobierz status urządzenia**
**GET /devices/:id/status**  
Zwraca aktualny status urządzenia (waga, stan diody, silnika itp.).

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Odpowiedź:**
```json
{
    "weight": 350,
    "button_state": "RELEASED",
    "led_state": "ON",
    "motor_state": "OFF",
    "updated_at": "2025-01-27T10:30:00"
}
```

---

## **Funkcjonalności MQTT**

### **1. Ustawienie czasu urządzenia**
**POST /devices/:id/set-time**  
Publikuje wiadomość na temat `update/set/time`, ustawiając czas systemowy urządzenia.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
    "timestamp": "2025-01-27T10:00:00"
}
```

**Odpowiedź:**
```json
{
    "message": "Time update sent successfully"
}
```

---

### **2. Pobranie aktualnego czasu urządzenia**
**GET /devices/:id/get-time**  
Publikuje żądanie na temat `update/get/time`. Zwraca aktualny czas urządzenia.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Odpowiedź:**
```json
{
    "current_time": "2025-01-27T10:00:00"
}
```

---

### **3. Ustawienie docelowej wagi wody**
**POST /devices/:id/set-water**  
Publikuje wiadomość na temat `update/set/water`, ustawiając docelową wagę wody.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
    "target_weight": 300
}
```

**Odpowiedź:**
```json
{
    "message": "Water target weight set to 300 grams"
}
```

---

### **4. Pobranie aktualnej wagi wody**
**GET /devices/:id/get-water**  
Publikuje żądanie na temat `update/get/water`. Zwraca aktualną wagę wody z urządzenia.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Odpowiedź:**
```json
{
    "weight": 350,
    "updated_at": "2025-01-27T10:30:00"
}
```

---

### **5. Usunięcie alarmu**
**DELETE /devices/:id/delete-alarm**  
Publikuje wiadomość na temat `update/del/alarm`, usuwając alarm na urządzeniu.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
    "timestamp": "2025-01-27T10:00:00"
}
```

**Odpowiedź:**
```json
{
    "message": "Alarm deleted successfully",
    "deletedAlarm": {
        "alarm_id": 1,
        "device_id": 12345,
        "timestamp": "2025-01-27T10:00:00",
        "target_weight": 200
    }
}
```

---

### **6. Nalewanie wody**
**POST /devices/:id/pour-water**  
Publikuje wiadomość na temat `update/put/pourwater`, rozpoczynając proces dolewania wody do zadanej wagi.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
    "target_weight": 250
}
```

**Odpowiedź:**
```json
{
    "message": "Pour water request sent successfully for target weight: 250 grams"
}
```

---

### **7. Resetowanie tary**
**POST /devices/:id/set-tare**  
Publikuje wiadomość na temat `update/set/tare`, resetując wagę urządzenia.

**Nagłówki:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Odpowiedź:**
```json
{
    "message": "Tare reset request sent successfully"
}
```

---

