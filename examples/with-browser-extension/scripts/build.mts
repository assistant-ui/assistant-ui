import { build, context } from "esbuild";
import { promises as fs } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const isWatch = process.argv.includes("--watch");
const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

const buildCss = async () => {
  const input = await fs.readFile(path.join(rootDir, "app.css"), "utf-8");
  const result = await postcss([tailwindcss]).process(input, {
    from: path.join(rootDir, "app.css"),
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

const buildExtension = async () => {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await fs.copyFile(
    path.join(rootDir, "manifest.json"),
    path.join(distDir, "manifest.json"),
  );
  await fs.copyFile(
    path.join(rootDir, "sidepanel.html"),
    path.join(distDir, "sidepanel.html"),
  );

  const staticDir = path.join(rootDir, "static");
  const staticFiles = await fs.readdir(staticDir);
  for (const file of staticFiles) {
    await fs.copyFile(path.join(staticDir, file), path.join(distDir, file));
  }

  const commonOptions = {
    bundle: true,
    format: "iife" as const,
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

  await build({
    ...commonOptions,
    entryPoints: [path.join(rootDir, "background.ts")],
    outfile: path.join(distDir, "background.js"),
  });
  console.log("Built background.js");

  if (isWatch) {
    const ctx = await context({
      ...commonOptions,
      entryPoints: [path.join(rootDir, "sidepanel.tsx")],
      outfile: path.join(distDir, "sidepanel.js"),
      jsx: "automatic",
    });
    await ctx.watch();
    console.log("Watching sidepanel.tsx for changes...");
  } else {
    await build({
      ...commonOptions,
      entryPoints: [path.join(rootDir, "sidepanel.tsx")],
      outfile: path.join(distDir, "sidepanel.js"),
      jsx: "automatic",
    });
    console.log("Built sidepanel.js");
  }

  await buildCss();
  console.log("Built sidepanel.css");

  console.log(
    "Build complete. Load dist/ as unpacked extension in chrome://extensions",
  );
};

await buildExtension();
