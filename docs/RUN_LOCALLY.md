# Local Development & Setup Guide

This guide details how to set up, configure, run, and troubleshoot the Agaate Farm Management PWA on a local development machine.

---

## 1. Prerequisites

- **Node.js**: v20+ (`node -v`)
- **npm**: v10+ (`npm -v`)
- **Database Engine**:
  - **Option A (Recommended for WSL2 users)**: MariaDB or MySQL 8.0 running inside WSL2 (Ubuntu).
  - **Option B**: Docker Desktop with Docker Compose.

---

## 2. Environment Configuration

1. Copy `.env.example` to `.env` in the repository root:
   ```bash
   cp .env.example .env
   ```
2. Verify critical connection strings:
   ```ini
   # Use 127.0.0.1 instead of localhost on Windows to avoid IPv6 (::1) loopback mismatches
   DATABASE_URL="mysql://agaate:local-development-only@127.0.0.1:3306/agaate"
   APP_SESSION_SECRET="local-development-session-secret-change-this-before-production-32chars"

   # Initial Super Admin credentials for seeding
   INITIAL_ADMIN_EMAIL="admin@agaate.local"
   INITIAL_ADMIN_PASSWORD="LocalAdminPassword-ChangeMe-123"
   INITIAL_ADMIN_NAME="Agaate Super Admin"

   # Allowed origins for CORS & WebAuthn
   ALLOWED_ORIGINS="http://localhost:3000"
   APP_URL="http://localhost:3000"
   ```

---

## 3. Database Setup

Choose either **Option A** or **Option B**:

### Option A: WSL2 Ubuntu (MariaDB / MySQL)

If you run your database inside WSL2:

1. **Start MariaDB service inside WSL**:
   ```powershell
   wsl -u root -d Ubuntu service mariadb start
   ```

2. **Prevent WSL from auto-terminating on idle**:
   WSL2 automatically shuts down after ~15–20 seconds when no terminal session is open. To prevent connection drops while Next.js is running, add `vmIdleTimeout=-1` to `C:\Users\<username>\.wslconfig`:
   ```ini
   [wsl2]
   memory=6GB
   processors=4
   swap=2GB
   localhostForwarding=true
   vmIdleTimeout=-1
   ```
   Apply changes by restarting WSL:
   ```powershell
   wsl --shutdown
   wsl -u root -d Ubuntu service mariadb start
   ```

3. **Verify database and credentials**:
   Ensure user `agaate` and database `agaate` exist:
   ```bash
   wsl -u root -d Ubuntu mariadb -e "CREATE DATABASE IF NOT EXISTS agaate;"
   wsl -u root -d Ubuntu mariadb -e "CREATE USER IF NOT EXISTS 'agaate'@'%' IDENTIFIED BY 'local-development-only';"
   wsl -u root -d Ubuntu mariadb -e "GRANT ALL PRIVILEGES ON agaate.* TO 'agaate'@'%'; FLUSH PRIVILEGES;"
   ```

---

### Option B: Docker Compose

If using Docker Desktop:

1. Ensure Docker Desktop is running.
2. Start MySQL and MinIO:
   ```bash
   docker compose up -d mysql minio
   ```
3. Check container status:
   ```bash
   docker compose ps
   ```

---

## 4. Dependencies & Schema Synchronization

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

3. **Push / Migrate schema**:
   Synchronize Prisma schema with the database:
   ```bash
   npx prisma db push
   ```
   *(Or run `npm run db:migrate` if using migration tracking)*.

4. **Seed test accounts and data**:
   ```bash
   npm run db:seed
   ```

---

## 5. Starting the Application

Run the development server:
```bash
npm run dev
```

The application will be available at:
**[http://localhost:3000](http://localhost:3000)**

---

## 6. Preconfigured Test Accounts

The seed script initializes accounts for each user role with password `LocalAdminPassword-ChangeMe-123`:

| Role | Email | Password | Default Landing Page |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@agaate.local` | `LocalAdminPassword-ChangeMe-123` | `/dashboard` |
| **Farm Admin** | `farmadmin@agaate.local` | `LocalAdminPassword-ChangeMe-123` | `/owner/dashboard` |
| **Senior Agronomist** | `agronomist@agaate.local` | `LocalAdminPassword-ChangeMe-123` | `/tasks` |
| **Lead Farm Officer** | `officer@agaate.local` | `LocalAdminPassword-ChangeMe-123` | `/officer/day` |

> [!TIP]
> You can also click the quick buttons under **"QUICK TEST ACCESS"** on the login page to sign in immediately.

---

## 7. Troubleshooting

### Issue 1: `Can't reach database server at localhost:3306`
- **Cause**: MariaDB in WSL2 stopped, or Windows resolved `localhost` to IPv6 `::1`.
- **Fix**:
  1. Verify WSL status: `wsl -l -v`. If stopped, start it: `wsl -u root -d Ubuntu service mariadb start`.
  2. Check `.env`: ensure `DATABASE_URL` uses `127.0.0.1:3306` instead of `localhost:3306`.
  3. Test port from PowerShell:
     ```powershell
     Test-NetConnection -Port 3306 -ComputerName 127.0.0.1
     ```

### Issue 2: WSL stops running in background when terminal closes
- **Cause**: WSL2 idle timeout defaults to terminating the VM.
- **Fix**: Add `vmIdleTimeout=-1` in `C:\Users\<username>\.wslconfig` under `[wsl2]`.

### Issue 3: `The column agaate.User.phone does not exist`
- **Cause**: Database tables are missing newly added schema columns.
- **Fix**: Run `npx prisma db push --accept-data-loss` to synchronize schema definitions.

### Issue 4: Docker Desktop pipe connection error
- **Cause**: Docker Desktop Windows background service (`com.docker.service`) is not running.
- **Fix**: Either launch Docker Desktop with administrative privileges or switch to the WSL2 MariaDB setup in Option A.
