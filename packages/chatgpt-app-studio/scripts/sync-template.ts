#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const TEMPLATE_DIR = path.join(ROOT, "templates/starter");
const DEFAULT_TARGET = path.join(ROOT, ".preview");

const IGNORE_PATTERNS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".turbo",
  ".env.local",
];

function shouldIgnore(relativePath: string): boolean {
  return IGNORE_PATTERNS.some(
    (pattern) =>
      relativePath === pattern || relativePath.startsWith(`${pattern}/`),
  );
}

function copyDir(src: string, dest: string, baseDir: string = src): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const relativePath = path.relative(baseDir, srcPath);

    if (shouldIgnore(relativePath)) {
      continue;
    }

    let destName = entry.name;
    if (destName === "_gitignore") destName = ".gitignore";
    if (destName === "_npmrc") destName = ".npmrc";

    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, baseDir);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const targetDir = args[0] ? path.resolve(args[0]) : DEFAULT_TARGET;

  const isNewProject = !fs.existsSync(targetDir);

  console.log(`\x1b[36mSyncing template to:\x1b[0m ${targetDir}`);
  console.log();

  copyDir(TEMPLATE_DIR, targetDir);

  console.log("\x1b[32mTemplate synced successfully!\x1b[0m");
  console.log();

  if (isNewProject) {
    console.log("\x1b[33mNew preview project created. Run:\x1b[0m");
    console.log();
    console.log(`  cd ${path.relative(process.cwd(), targetDir)}`);
    console.log("  npm install");
    console.log("  npm run dev");
  } else {
    console.log(
      "\x1b[2mFiles synced. If the dev server is running, changes should hot-reload.\x1b[0m",
    );
  }
}

main();
