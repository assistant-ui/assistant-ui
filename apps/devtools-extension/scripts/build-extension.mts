import { build } from "esbuild";
import { promises as fs } from "node:fs";
import path from "node:path";

const nodeEnv = process.env.NODE_ENV ?? "production";
const defaultFrameUrl =
  nodeEnv === "development"
    ? "http://localhost:3010"
    : "https://devtools-frame.assistant-ui.com";
const frameUrl = process.env.DEVTOOLS_FRAME_URL ?? defaultFrameUrl;

console.log("frameUrl", frameUrl);

const defineEnv = {
  "process.env.NODE_ENV": JSON.stringify(nodeEnv),
  "process.env.DEVTOOLS_FRAME_URL": JSON.stringify(frameUrl),
};

const buildExtension = async () => {
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, "dist");
  const resolve = (...segments: string[]) => path.join(rootDir, ...segments);

  // Clean extension dist directory
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  // Copy manifest
  try {
    await fs.copyFile(
      resolve("manifest.json"),
      path.join(distDir, "manifest.json"),
    );
  } catch {
    console.warn("No manifest.json found, skipping copy");
  }

  // Build content script
  try {
    await build({
      entryPoints: [resolve("content.ts")],
      bundle: true,
      format: "iife",
      target: "chrome100",
      outfile: path.join(distDir, "content.js"),
      external: [],
      minify: true,
      sourcemap: true,
      define: defineEnv,
    });
    console.log("✅ Content script built");
  } catch {
    console.warn("No content.ts found, skipping content script build");
  }

  // Build devtools panel
  try {
    await build({
      entryPoints: [resolve("devtools-panel.tsx")],
      bundle: true,
      format: "iife",
      target: "chrome100",
      outfile: path.join(distDir, "devtools-panel.js"),
      jsx: "automatic",
      external: [],
      minify: true,
      sourcemap: true,
      define: defineEnv,
    });
    console.log("✅ DevTools panel built");
  } catch {
    console.warn("No devtools-panel.tsx found, skipping devtools panel build");
  }

  // Build devtools main script
  try {
    await build({
      entryPoints: [resolve("devtools.ts")],
      bundle: true,
      format: "iife",
      target: "chrome100",
      outfile: path.join(distDir, "devtools.js"),
      external: [],
      minify: true,
      sourcemap: true,
      define: defineEnv,
    });
    console.log("✅ DevTools main script built");
  } catch {
    console.warn("No devtools.ts found, skipping devtools main script build");
  }

  // Build background service worker
  try {
    await build({
      entryPoints: [resolve("background.ts")],
      bundle: true,
      format: "iife",
      target: "chrome100",
      outfile: path.join(distDir, "background.js"),
      external: [],
      minify: true,
      sourcemap: true,
      define: defineEnv,
    });
    console.log("✅ Background service worker built");
  } catch {
    console.warn(
      "No background.ts found, skipping background service worker build",
    );
  }

  // Copy static files
  try {
    const staticDir = resolve("static");
    const staticFiles = await fs.readdir(staticDir);
    for (const file of staticFiles) {
      await fs.copyFile(path.join(staticDir, file), path.join(distDir, file));
    }
    console.log("✅ Static files copied");
  } catch {
    console.warn("No static files found, skipping copy");
  }

  // Build inject script

  await build({
    entryPoints: [resolve("inject.ts")],
    bundle: true,
    format: "iife",
    target: "chrome100",
    outfile: path.join(distDir, "inject.js"),
    external: [],
    // minify: true,
    sourcemap: true,
    define: defineEnv,
  });
  console.log("✅ Inject script built");

  console.log("🎉 Chrome extension build completed");
};

await buildExtension();
