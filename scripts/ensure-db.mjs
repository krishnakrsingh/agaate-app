import net from "node:net";
import { spawn } from "node:child_process";

const PORT = 3306;
const HOST = "127.0.0.1";

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
  console.log("[db-guard] Port 3306 is not open. Starting WSL MariaDB service...");
  try {
    const child = spawn(
      "wsl",
      ["-u", "root", "-d", "Ubuntu", "-e", "/bin/bash", "-c", "service mariadb start && sleep infinity"],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      }
    );
    child.unref();
  } catch (err) {
    console.warn("[db-guard] Could not auto-launch WSL MariaDB:", err.message);
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
      console.log("[db-guard] MariaDB is ready on 127.0.0.1:3306.");
      return;
    }
  }

  console.warn(
    "[db-guard] Warning: Database on 127.0.0.1:3306 was not ready within 8 seconds.\n" +
      "If Next.js encounters a database connection error, ensure MariaDB or Docker is running:\n" +
      "  wsl -u root -d Ubuntu service mariadb start\n" +
      "  docker compose up -d mysql\n"
  );
}

main().catch(() => {});
