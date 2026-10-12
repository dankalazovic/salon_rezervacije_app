# Salon Reservation System

A full-stack **academic team project** for booking salon appointments, managing services, and viewing reservation statistics. The system consists of two React applications, two Express APIs, PostgreSQL databases, and background processes communicating through Redis Pub/Sub.

> **Project status:** Developed for coursework and tested locally. It is not production-ready.

## Technologies

- **Frontend:** React, TypeScript, Vite; Recharts for reporting
- **Backend:** Node.js, Express, TypeScript, REST APIs
- **Databases:** PostgreSQL (separate salon and reporting databases)
- **Caching and events:** Redis cache and Redis Pub/Sub
- **Infrastructure:** Docker, Docker Compose

## Features

- Browse service categories, prices, and available appointment times.
- Create reservations for multiple services, with date and time selection and capacity checks.
- Access a reservation using an access code and email; add or remove services or cancel it.
- Apply supported discounts and promotional codes; view estimated prices in different currencies.
- Manage salon services, categories, settings, and opening hours through an admin interface.
- View reservation statistics by service category and date in a separate reporting dashboard.
- Publish reservation events (`reservation.created`, `reservation.updated`, `reservation.cancelled`) using Redis Pub/Sub.

## Architecture

```text
Salon UI (React, port 5173)
      |
      v
Salon API (Express, port 4000) -----> Redis cache
      |                                      |
      +---- publish reservation events ----> Redis Pub/Sub
                                              |          |
                                              v          v
                                      Salon worker   Portal subscriber
                                              |          |
                                              v          v
                                        salon-db     portal-db
                                                   ^
                                                   |
Reporting UI (React, port 5174) ---> Portal API (Express, port 4001)
```

The salon worker handles the asynchronous database write for new reservations. The portal subscriber handles reservation events and updates the reporting database. **Redis Pub/Sub is not a durable message queue:** events can be lost when subscribers are disconnected. The current API can acknowledge a reservation request before its background write completes.

## Project structure

```text
apps/
  init.sql                  Initial salon database schema and sample data
  salon-frontend/           Customer booking UI and salon admin interface
  salon-backend/            Salon REST API, Redis publisher and worker
  salon-reporting/          Reporting UI with charts
  portal-backend/           Reporting API and Redis subscriber
docker-compose.yml          Databases, Redis, APIs, and background processes
setup.ps1                   Destructive reset script; not needed for regular startup
```

## Local setup (Windows PowerShell)

### Prerequisites

- Node.js and npm
- Docker Desktop with Docker Compose
- Available local ports: `4000`, `4001`, `5173`, `5174`, `5432`, `5433`, and `6379`

Run the following commands from the repository root unless otherwise specified.

### 1. Start PostgreSQL and Redis

```powershell
docker compose up -d salon-db portal-db redis
docker compose ps
```

### 2. Initialize the salon database (first setup only)

Run this only against a **new, empty development database**:

```powershell
docker cp .\apps\init.sql salon-db:/tmp/init.sql
docker exec salon-db psql -v ON_ERROR_STOP=1 -U salon -d salon_db -f /tmp/init.sql
```

The portal subscriber creates its reporting tables at startup. Do **not** run `setup.ps1` as a routine startup command: it truncates application tables and clears stored data.

### 3. Start backend services

```powershell
docker compose up -d --build
docker compose ps
```

This starts the salon API, salon worker, portal API, and portal subscriber in addition to the databases and Redis. Test API health:

- Salon API: http://localhost:4000/health
- Portal API: http://localhost:4001/health

### 4. Start the salon frontend

Open a **new terminal** in the repository root:

```powershell
cd apps/salon-frontend
npm ci
npm run dev -- --port 5173
```

Open http://localhost:5173. The admin page is available at http://localhost:5173/admin.

### 5. Start the reporting frontend

Open **another terminal** in the repository root:

```powershell
cd apps/salon-reporting
npm ci
npm run dev -- --port 5174
```

Open http://localhost:5174.

The frontend code currently calls the APIs at `localhost:4000` and `localhost:4001`; these instructions assume everything runs on the same computer.

### Stopping the application

Stop each Vite development server using **Ctrl+C** in its terminal. From the repository root, stop Docker services with:

```powershell
docker compose stop
```

To restart existing containers without resetting the databases:

```powershell
docker compose start
```

**Do not use `docker compose down -v` unless you intend to delete the database volumes.**

## Verification

After starting the project, try the following manually:

1. Browse salon services and select a date and time.
2. Create a test reservation and use its access code to find it.
3. Test editing or cancelling a reservation.
4. Check whether the reservation appears in the reporting dashboard.
5. If something fails, inspect service logs with `docker compose logs --tail=100 salon-backend salon-worker portal-backend portal-subscriber`.

A successful TypeScript build alone does not establish that the entire booking and reporting workflow works correctly.

## Known limitations

- Authentication uses a basic database credential check and is **not suitable for a publicly accessible production environment**. Password hashing, authorization, and session security would need improvement.
- Local database passwords and any example admin credentials are **demo-only**. Never reuse these credentials on production systems.
- Redis Pub/Sub does not guarantee message delivery or replay.
- API documentation at `/docs` is a scaffold; the OpenAPI route specification is incomplete.
- Some npm dependencies have reported security advisories and should be reviewed before public deployment.

## Contributors

Built as a university team project. See repository history for recorded contributions.
