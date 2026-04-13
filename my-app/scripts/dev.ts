#!/usr/bin/env tsx
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SERVER_DIR = path.join(ROOT, "server");

const hasServer =
  fs.existsSync(SERVER_DIR) &&
  fs.existsSync(path.join(SERVER_DIR, "package.json"));

interface ProcessConfig {
  name: string;
  command: string;
  args: string[];
  cwd: string;
  color: string;
}

const processes: ProcessConfig[] = [
  {
    name: "next",
    command: "npx",
    args: ["next", "dev"],
    cwd: ROOT,
    color: "\x1b[36m", // cyan
  },
];

if (hasServer) {
  const serverNodeModules = path.join(SERVER_DIR, "node_modules");
  if (!fs.existsSync(serverNodeModules)) {
    console.log("\x1b[33m⚠️  Server dependencies not installed.\x1b[0m");
    console.log("\x1b[33m   Run: cd server && npm install\x1b[0m\n");
  } else {
    processes.push({
      name: "server",
      command: "npm",
      args: ["run", "dev"],
      cwd: SERVER_DIR,
      color: "\x1b[35m", // magenta
    });
  }
}

const reset = "\x1b[0m";
const dim = "\x1b[2m";

function prefixOutput(
  name: string,
  color: string,
  data: Buffer | string,
): void {
  const lines = data.toString().split("\n");
  for (const line of lines) {
    if (line.trim()) {
      const prefix = `${color}[${name}]${reset}`;
      console.log(`${prefix} ${line}`);
    }
  }
}

const children: ChildProcess[] = [];

function cleanup(): void {
  for (const child of children) {
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  }
}

process.on("SIGINT", () => {
  console.log(`\n${dim}Shutting down...${reset}`);
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

console.log(`\n${dim}Starting development servers...${reset}\n`);

if (hasServer && processes.length === 2) {
  console.log(`${dim}  • Next.js workbench: http://localhost:3000${reset}`);
  console.log(`${dim}  • MCP server:        http://localhost:3001/mcp${reset}`);
} else {
  console.log(`${dim}  • Next.js workbench: http://localhost:3000${reset}`);
}

console.log();

for (const config of processes) {
  const child = spawn(config.command, config.args, {
    cwd: config.cwd,
    stdio: ["inherit", "pipe", "pipe"],
    detached: true,
    shell: process.platform === "win32",
  });

  children.push(child);

  child.stdout?.on("data", (data) => {
    prefixOutput(config.name, config.color, data);
  });

  child.stderr?.on("data", (data) => {
    prefixOutput(config.name, config.color, data);
  });

  child.on("error", (error) => {
    console.error(
      `${config.color}[${config.name}]${reset} Error: ${error.message}`,
    );
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.log(
        `${config.color}[${config.name}]${reset} Exited with code ${code}`,
      );
    }
  });
}
