import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(packageRoot, "src", "mixer", "assets");
const target = join(packageRoot, "dist", "mixer", "assets");

if (!existsSync(source)) {
  throw new Error(`Recipe asset source directory is missing: ${source}`);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, {
  recursive: true,
  filter(src) {
    const normalized = src.replaceAll("\\", "/");
    return !normalized.includes("/node_modules/")
      && !normalized.includes("/.next/")
      && !normalized.includes("/dist/")
      && !normalized.includes("/build/")
      && !normalized.endsWith(".zip");
  },
});
