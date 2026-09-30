import { build, context, type BuildOptions, type Plugin } from "esbuild";
import { promises as fs, watch as fsWatch } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const isWatch = process.argv.includes("--watch");
const rootDir = path.resolve(import.meta.dirname, "..");
const distDir = path.join(rootDir, "dist");
const cssEntry = path.join(rootDir, "webview", "app.css");
const cssOut = path.join(distDir, "webview", "app.css");

const buildCss = async () => {
  const input = await fs.readFile(cssEntry, "utf-8");
  const result = await postcss([tailwindcss]).process(input, {
    from: cssEntry,
    to: cssOut,
  });
  await fs.mkdir(path.dirname(cssOut), { recursive: true });
  await fs.writeFile(cssOut, result.css);
};

// The start/finish lines drive the background problem matcher in .vscode/tasks.json.
let watching = false;
const watchLog = (afterBuild?: () => Promise<void>): Plugin => ({
  name: "watch-log",
  setup(b) {
    b.onStart(() => {
      if (watching) console.log("[watch] build started");
    });
    b.onEnd(async (result) => {
      if (result.errors.length === 0) await afterBuild?.();
      if (watching) console.log("[watch] build finished");
    });
  },
});

const nodeOptions: BuildOptions = {
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node22",
  external: ["vscode"],
  sourcemap: true,
  minify: !isWatch,
};

const hostOptions: BuildOptions = {
  ...nodeOptions,
  entryPoints: [path.join(rootDir, "src", "extension.ts")],
  outfile: path.join(distDir, "extension.js"),
  plugins: [watchLog()],
};

const testOptions: BuildOptions = {
  ...nodeOptions,
  entryPoints: [path.join(rootDir, "test", "suite.ts")],
  outfile: path.join(distDir, "test", "suite.js"),
  plugins: [watchLog()],
};

const webviewOptions: BuildOptions = {
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome120",
  splitting: false,
  jsx: "automatic",
  sourcemap: true,
  minify: !isWatch,
  resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
  entryPoints: [path.join(rootDir, "webview", "main.tsx")],
  outfile: path.join(distDir, "webview", "main.js"),
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isWatch ? "development" : "production",
    ),
  },
  plugins: [watchLog(buildCss)],
};

const allOptions = [hostOptions, testOptions, webviewOptions];

await fs.rm(distDir, { recursive: true, force: true });

if (isWatch) {
  console.log("[watch] build started");
  const contexts = await Promise.all(allOptions.map((o) => context(o)));
  await Promise.allSettled(contexts.map((ctx) => ctx.rebuild()));
  console.log("[watch] build finished");
  watching = true;
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  let cssTimer: NodeJS.Timeout | undefined;
  fsWatch(cssEntry, () => {
    clearTimeout(cssTimer);
    cssTimer = setTimeout(() => {
      buildCss().catch((err) => console.error("CSS rebuild failed:", err));
    }, 50);
  });
} else {
  await Promise.all(allOptions.map((o) => build(o)));
  console.log("Built dist/extension.js, dist/test/suite.js, dist/webview/");
}
