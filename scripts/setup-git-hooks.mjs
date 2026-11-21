import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url));

if (process.env.HUSKY !== "0" && existsSync(path.join(root, ".git"))) {
  const result = spawnSync("git", ["config", "core.hooksPath", ".husky"], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
