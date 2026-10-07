import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "../../templates/cloud-harness");
const target = path.join(root, "templates/cloud-harness");
if (!existsSync(source))
  throw new Error(`Cloud harness template is missing: ${source}`);
mkdirSync(path.dirname(target), { recursive: true });
const temporary = mkdtempSync(
  path.join(path.dirname(target), "cloud-harness-"),
);
try {
  cpSync(source, temporary, {
    recursive: true,
    filter: (file) =>
      ![
        "node_modules",
        ".next",
        ".turbo",
        "dist",
        "coverage",
        "out",
        "build",
        ".vercel",
        ".DS_Store",
        "cloud.json",
        "provision.json",
        "next-env.d.ts",
      ].includes(path.basename(file)) &&
      (!path.basename(file).startsWith(".env") ||
        path.basename(file) === ".env.example") &&
      !file.endsWith(".tsbuildinfo"),
  });
  rmSync(target, { recursive: true, force: true });
  renameSync(temporary, target);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
