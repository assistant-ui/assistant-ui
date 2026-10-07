import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(resolve(root, "scripts/example-bundles.json"), "utf8"),
);
const args = process.argv.slice(2);
if (args.some((arg) => !/^--(?:dry(?:=json)?|force|no-cache)$/.test(arg)))
  throw new Error(
    "Only --dry, --dry=json, --force, and --no-cache are supported.",
  );
execFileSync(
  "pnpm",
  [
    "exec",
    "turbo",
    "preview:build",
    ...manifest.map(({ package: name }) => `--filter=${name}`),
    ...args,
  ],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);
