/**
 * Simple development server for serving Tool UI components.
 *
 * This serves:
 * - /render - HTML page that hosts the component iframe
 * - /bundle.js - The compiled UI bundle
 * - /manifest.json - The UI manifest for discovery
 *
 * In production, these would be served from *.auiusercontent.com
 */

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.UI_PORT || 3001;

// Read manifest (prefer dev manifest for local development)
const devManifestPath = resolve(__dirname, "../manifest.dev.json");
const prodManifestPath = resolve(__dirname, "../manifest.json");
const manifestPath = existsSync(devManifestPath)
  ? devManifestPath
  : prodManifestPath;
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf-8"))
  : null;

// Read static files
const renderHtmlPath = resolve(__dirname, "../static/render.html");
const bundlePath = resolve(__dirname, "../dist/bundle.js");

const server = createServer((req, res) => {
  // CORS headers for cross-origin iframe embedding
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Allow embedding in iframes
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve manifest (support both direct and registry-style paths)
  if (
    url.pathname === "/manifest.json" ||
    url.pathname === "/v1/servers/weather-mcp/manifest.json"
  ) {
    if (!manifest) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Manifest not found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(manifest));
    return;
  }

  // Serve render page
  if (url.pathname === "/render") {
    if (!existsSync(renderHtmlPath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("render.html not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(readFileSync(renderHtmlPath, "utf-8"));
    return;
  }

  // Serve bundle
  if (url.pathname === "/bundle.js") {
    if (!existsSync(bundlePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Bundle not found. Run 'pnpm build:ui' first.");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache", // No caching for dev
    });
    res.end(readFileSync(bundlePath, "utf-8"));
    return;
  }

  // 404 for everything else
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n🎨 Tool UI Server running at http://localhost:${PORT}`);
  console.log(`\n  Endpoints:`);
  console.log(`    GET /render       - Iframe render page`);
  console.log(`    GET /bundle.js    - UI component bundle`);
  console.log(`    GET /manifest.json - UI manifest\n`);
});
