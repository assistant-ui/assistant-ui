// Runs a command with DOCS_LITE=1, so `dev:lite` works in any shell.
import { spawnSync } from "node:child_process";

const [command, ...args] = process.argv.slice(2);
const { status, signal, error } = spawnSync(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DOCS_LITE: "1" },
});
if (error) throw error;
if (signal) process.kill(process.pid, signal);
else process.exit(status ?? 1);
