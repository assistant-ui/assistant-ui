// Runs a command with KEY=VALUE env vars set, so `dev:full` and `dev:lite`
// work in any shell: node with-env.mjs DOCS_LITE=1 pnpm dev
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const env = { ...process.env };
while (args[0]?.includes("=")) {
  const [key, ...value] = args.shift().split("=");
  env[key] = value.join("=");
}
const [command, ...rest] = args;
const { status, signal, error } = spawnSync(command, rest, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env,
});
if (error) throw error;
if (signal) process.kill(process.pid, signal);
else process.exit(status ?? 1);
