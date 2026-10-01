import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(resolve(root, "scripts/example-bundles.json"), "utf8"),
);
execFileSync(
  "pnpm",
  [
    "exec",
    "turbo",
    "preview:build",
    ...manifest.map(({ package: name }) => `--filter=${name}`),
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: "inherit" },
);
