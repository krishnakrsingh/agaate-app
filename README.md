# Agaate — Precision Agricultural Operations Platform

A line-first operational system for agricultural estates: verified field presence, 7-day rolling agronomy task matrix, crop cycle geometry, and automated operations intelligence.

---

## ⚡ Quick Start Guide (Run in 3 Steps)

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js 20+** (`node -v`)
- **Docker Desktop** (Make sure Docker Desktop is running)
- **npm** (`npm -v`)

---

### 2. Startup Commands

Open your terminal in the project root (`c:\Users\krish\Downloads\agaateapp`):

```bash
# Step 1: Install dependencies (if first time)
npm install

# Step 2: Start background services (MySQL 8.0 & MinIO Object Storage)
docker compose up -d

# Step 3: Seed the database with the ultra-rich multi-estate demo dataset
npm run db:seed

# Step 4: Start the Next.js development server
npm run dev
```

The application is now live at: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Ready-to-Use Demo Personas

The database is pre-seeded with 4 distinct hierarchy roles. You can use the **1-click persona buttons on the `/login` screen** or sign in manually with the credentials below:

| Persona | Role | Email | Password | Primary Interface / Features |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | `admin@agaate.local` | `LocalAdminPassword-ChangeMe-123` | Multi-estate portfolio overview, estate activation gatekeeper, team access controls, audit logs. |
| **Farm Admin** | `FARM_ADMIN` | `farmadmin@agaate.local` | `LocalAdminPassword-ChangeMe-123` | Governance & approvals queue (attendance exceptions, estate relocation requests), plot management. |
| **Senior Agronomist** | `AGRONOMIST` | `agronomist@agaate.local` | `LocalAdminPassword-ChangeMe-123` | Crop cycle planning (bed & mulch math), 7-day agronomy dispatch matrix, weather overrides, prescription history. |
| **Lead Field Officer** | `FARM_OFFICER` | `officer@agaate.local` | `LocalAdminPassword-ChangeMe-123` | Mobile field console, geofenced GPS clock-in, task completion with fertilizer/labor logs, crop scouting. |

---

## 🛠️ Service Infrastructure & Ports

| Service | Port | Endpoint / Console URL | Default Credentials |
| :--- | :--- | :--- | :--- |
| **Next.js Web App** | `3000` | [http://localhost:3000](http://localhost:3000) | Persona credentials above |
| **MySQL 8.0 Database** | `3306` | `localhost:3306/agaate_db` | User: `root` \| Password: `password` |
| **MinIO S3 API** | `9000` | [http://localhost:9000](http://localhost:9000) | Key: `minioadmin` \| Secret: `minioadmin` |
| **MinIO Web Console** | `9001` | [http://localhost:9001](http://localhost:9001) | User: `minioadmin` \| Password: `minioadmin` |

---

## 🧪 Available NPM Scripts

```bash
# Start Next.js development server with Turbopack hot-reload
npm run dev

# Run all 134 automated unit, integration, and security penetration tests
npm test

# Re-seed the database with 4 estates, crop cycles, tasks, and incidents
npm run db:seed

# Generate Prisma client bindings
npm run db:generate

# Apply pending Prisma database migrations
npm run db:migrate

# Build production bundle (compiles all 32 routes)
npm run build

# Start production server
npm start
```

---

## 🚨 Troubleshooting & Common Fixes

### 1. Laptop Reboot / Docker Daemon Connection Error
If you see `failed to connect to the docker API` or `The system cannot find the file specified`:
1. Open **Docker Desktop** from your Windows Start Menu or Desktop.
2. Wait until the Docker whale icon in your system tray indicates that Docker engine is running.
3. Run `docker compose up -d`.

### 2. Reset or Reseed Database
To reset the database to a clean, rich operational state:
```bash
npm run db:seed
```

### 3. Port Conflicts (Port 3000 or 3306 in use)
- If port 3000 is occupied, run `npm run dev -- -p 3001`.
- If local MySQL is already running on port 3306, stop your local MySQL service or adjust the port mapping in `docker-compose.yml`.

---

## 📚 Architectural & Technical Documentation

For in-depth architectural specifications and user flows, refer to the [`docs/`](docs/) directory:
- **[`01_PRD.md`](docs/01_PRD.md)** — Product Requirements Document & Feature Specs.
- **[`02_TDD.md`](docs/02_TDD.md)** — Technical Architecture, APIs, and Security.
- **[`03_USER_FLOWS.md`](docs/03_USER_FLOWS.md)** — Interactive Mermaid User Workflows.
- **[`04_DESIGN_BRIEF.md`](docs/04_DESIGN_BRIEF.md)** — Line-First Design System Specifications.
- **[`05_DATA_MODEL.md`](docs/05_DATA_MODEL.md)** — Schema Models, Enums, and Entity Relationships.
- **[`06_ENGINEERING_PLAN.md`](docs/06_ENGINEERING_PLAN.md)** — Production Operations & Roadmap.
