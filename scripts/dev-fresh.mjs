import { execSync, spawn } from "node:child_process";
import fs from "node:fs";

const PORT = process.env.PORT ?? "3000";
const PORT_RANGE = 10;

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const pids = new Set();

      for (const line of out.split("\n")) {
        if (!line.includes("LISTENING")) continue;
        const match = line.match(/\s+(\d+)\s*$/);
        if (match) pids.add(match[1]);
      }

      for (const pid of pids) {
        if (pid === String(process.pid)) continue;
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        } catch {
          // Process may already be gone.
        }
      }
      return;
    }

    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore", shell: true });
  } catch {
    // Nothing listening on the port.
  }
}

function killDevPorts() {
  const base = Number(PORT);
  for (let i = 0; i < PORT_RANGE; i += 1) {
    killPort(String(base + i));
  }
}

killDevPorts();

if (fs.existsSync(".next")) {
  fs.rmSync(".next", { recursive: true, force: true });
}

console.log(`Starting Next.js on http://localhost:${PORT} (cache cleared)`);

const child = spawn(`npx next dev -p ${PORT}`, {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
