import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "../../templates/cloud-harness");
const target = path.join(root, "templates/cloud-harness");
rmSync(target, { recursive: true, force: true });
mkdirSync(path.dirname(target), { recursive: true });
cpSync(source, target, {
  recursive: true,
  filter: (file) =>
    !["node_modules", ".next", "cloud.json", "next-env.d.ts"].includes(
      path.basename(file),
    ) &&
    (!path.basename(file).startsWith(".env") ||
      path.basename(file) === ".env.example") &&
    !file.endsWith(".tsbuildinfo"),
});
