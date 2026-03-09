/**
 * Post-export script that flattens deeply nested pnpm asset paths
 * in the Expo static export output. This fixes 404s on Vercel where
 * the __node_modules paths are too long or get blocked.
 *
 * It copies asset files to /assets/<filename> and rewrites the JS
 * bundle references accordingly.
 */

import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");
const ASSETS_DIR = path.join(DIST, "assets");
const NODE_MODULES_DIR = path.join(ASSETS_DIR, "__node_modules");

if (!fs.existsSync(NODE_MODULES_DIR)) {
  console.log("No __node_modules assets to flatten.");
  process.exit(0);
}

// 1. Collect all asset files from __node_modules
const assetFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      assetFiles.push(full);
    }
  }
}
walk(NODE_MODULES_DIR);

// 2. Copy each asset to /assets/<filename> and build a replacement map
const replacements = new Map();
for (const file of assetFiles) {
  const filename = path.basename(file);
  const relOld = `/assets/${path.relative(ASSETS_DIR, file)}`;
  const relNew = `/assets/${filename}`;
  const dest = path.join(ASSETS_DIR, filename);

  if (!fs.existsSync(dest)) {
    fs.copyFileSync(file, dest);
  }
  replacements.set(relOld, relNew);
}

// 3. Rewrite references in JS bundles and HTML files
function rewriteFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteFiles(full, extensions);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      let content = fs.readFileSync(full, "utf8");
      let changed = false;
      for (const [oldPath, newPath] of replacements) {
        if (content.includes(oldPath)) {
          content = content.replaceAll(oldPath, newPath);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(full, content);
        console.log(`Rewrote asset paths in ${path.relative(DIST, full)}`);
      }
    }
  }
}
rewriteFiles(DIST, [".js", ".html", ".css"]);

// 4. Clean up __node_modules directory
fs.rmSync(NODE_MODULES_DIR, { recursive: true, force: true });

console.log(`Flattened ${replacements.size} assets.`);
