import { build, context, type BuildOptions } from "esbuild";
import { promises as fs, watch as fsWatch } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const isWatch = process.argv.includes("--watch");
const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const cssEntry = path.join(rootDir, "app.css");

const buildCss = async () => {
  const input = await fs.readFile(cssEntry, "utf-8");
  const result = await postcss([tailwindcss]).process(input, {
    from: cssEntry,
    to: path.join(distDir, "sidepanel.css"),
  });
  await fs.writeFile(path.join(distDir, "sidepanel.css"), result.css);
  if (result.map) {
    await fs.writeFile(
      path.join(distDir, "sidepanel.css.map"),
      result.map.toString(),
    );
  }
};

const commonOptions: BuildOptions = {
  bundle: true,
  format: "iife",
  target: "chrome100",
  minify: !isWatch,
  sourcemap: true,
  resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isWatch ? "development" : "production",
    ),
  },
};

const backgroundOptions: BuildOptions = {
  ...commonOptions,
  entryPoints: [path.join(rootDir, "background.ts")],
  outfile: path.join(distDir, "background.js"),
};

const sidepanelOptions: BuildOptions = {
  ...commonOptions,
  entryPoints: [path.join(rootDir, "sidepanel.tsx")],
  outfile: path.join(distDir, "sidepanel.js"),
  jsx: "automatic",
};

const buildExtension = async () => {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  const staticDir = path.join(rootDir, "static");
  const staticFiles = await fs.readdir(staticDir);

  await Promise.all([
    fs.copyFile(
      path.join(rootDir, "manifest.json"),
      path.join(distDir, "manifest.json"),
    ),
    fs.copyFile(
      path.join(rootDir, "sidepanel.html"),
      path.join(distDir, "sidepanel.html"),
    ),
    ...staticFiles.map((file) =>
      fs.copyFile(path.join(staticDir, file), path.join(distDir, file)),
    ),
  ]);

  if (isWatch) {
    const [backgroundCtx, sidepanelCtx] = await Promise.all([
      context(backgroundOptions),
      context(sidepanelOptions),
      buildCss(),
    ]);
    await Promise.all([backgroundCtx.watch(), sidepanelCtx.watch()]);
    // Re-run buildCss whenever app.css changes. fs.watch dedupes via debounce
    // since editors may fire multiple events per save.
    let cssTimer: NodeJS.Timeout | null = null;
    fsWatch(cssEntry, () => {
      if (cssTimer) clearTimeout(cssTimer);
      cssTimer = setTimeout(() => {
        cssTimer = null;
        buildCss().catch((err) => console.error("CSS rebuild failed:", err));
      }, 50);
    });
    console.log("Watching background.ts, sidepanel.tsx, and app.css...");
  } else {
    await Promise.all([
      build(backgroundOptions),
      build(sidepanelOptions),
      buildCss(),
    ]);
    console.log("Built background.js, sidepanel.js, sidepanel.css");
  }

  console.log(
    "Build complete. Load dist/ as unpacked extension in chrome://extensions",
  );
};

await buildExtension();
