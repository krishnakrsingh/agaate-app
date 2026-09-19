import net from "node:net";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

let dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl) {
  try {
    const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) dbUrl = match[1];
  } catch {
    // ignore
  }
}

const isPostgres = dbUrl.startsWith("postgres");
const PORT = isPostgres ? 5432 : 3306;
const HOST = "127.0.0.1";
const DB_NAME = isPostgres ? "PostgreSQL" : "MariaDB";
const SERVICE_CMD = isPostgres
  ? "service postgresql start && sleep infinity"
  : "service mariadb start && sleep infinity";

function checkPort(port, host, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function startWslDatabase() {
  console.log(`[db-guard] Port ${PORT} is not open. Starting WSL ${DB_NAME} service...`);
  try {
    const child = spawn(
      "wsl",
      ["-u", "root", "-d", "Ubuntu", "-e", "/bin/bash", "-c", SERVICE_CMD],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }
    );
    child.unref();
  } catch (err) {
    console.warn(`[db-guard] Could not auto-launch WSL ${DB_NAME}:`, err.message);
  }
}

async function main() {
  const alreadyRunning = await checkPort(PORT, HOST, 500);
  if (alreadyRunning) {
    return;
  }

  await startWslDatabase();

  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const isUp = await checkPort(PORT, HOST, 500);
    if (isUp) {
      console.log(`[db-guard] ${DB_NAME} is ready on ${HOST}:${PORT}.`);
      return;
    }
  }

  console.warn(
    `[db-guard] Warning: Database on ${HOST}:${PORT} was not ready within 8 seconds.\n` +
      `If Next.js encounters a database connection error, ensure ${DB_NAME} is running:\n` +
      `  wsl -u root -d Ubuntu service ${isPostgres ? "postgresql" : "mariadb"} start\n`
  );
}

main().catch(() => {});
