import { build, context, type BuildOptions, type Plugin } from "esbuild";
import { promises as fs, watch as fsWatch } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { generativeUiCss } from "./generative-ui-css.ts";

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

/**
 * Resolves `virtual:<name>` to a module whose default export lists the default
 * export of every `.ts`/`.tsx` file in a folder (sorted, skipping `_*` and
 * `*.test.*`), so a new file registers itself without a shared index.
 */
const GLOB_MODULES: Record<string, string> = {
  "virtual:rich-fixtures": path.join(rootDir, "src", "fixtures", "rich"),
  "virtual:fixture-uis": path.join(rootDir, "webview", "fixture-ui"),
  "virtual:gallery-sections": path.join(
    rootDir,
    "webview",
    "gallery",
    "sections",
  ),
};

const globModules: Plugin = {
  name: "glob-modules",
  setup(b) {
    b.onResolve({ filter: /^virtual:/ }, (args) =>
      GLOB_MODULES[args.path]
        ? { path: args.path, namespace: "glob-modules" }
        : undefined,
    );
    b.onLoad({ filter: /.*/, namespace: "glob-modules" }, async (args) => {
      const dir = GLOB_MODULES[args.path] as string;
      const files = (await fs.readdir(dir).catch(() => []))
        .filter((f) => /\.tsx?$/.test(f) && !f.startsWith("_"))
        .filter((f) => !/\.test\.tsx?$/.test(f))
        .sort();
      const lines = files.map(
        (f, i) => `import m${i} from ${JSON.stringify(path.join(dir, f))};`,
      );
      const entries = files.map(
        (f, i) => `{ file: ${JSON.stringify(f)}, value: m${i} }`,
      );
      return {
        contents: `${lines.join("\n")}\nexport default [${entries.join(", ")}];\n`,
        loader: "js",
        resolveDir: dir,
        watchDirs: [dir],
      };
    });
  },
};

/**
 * Writes `generative-ui.css`, the registry's `generative-ui-style` rules that
 * `shadcn add` puts in an app's CSS, next to `app.css`.
 */
const generativeUiStyle: Plugin = {
  name: "generative-ui-style",
  setup(b) {
    b.onEnd(async (result) => {
      if (result.errors.length > 0) return;
      await fs.mkdir(path.join(distDir, "webview"), { recursive: true });
      await fs.writeFile(
        path.join(distDir, "webview", "generative-ui.css"),
        `${generativeUiCss()}\n`,
      );
    });
  },
};

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
  plugins: [watchLog(), globModules],
};

const testOptions: BuildOptions = {
  ...nodeOptions,
  entryPoints: [path.join(rootDir, "test", "suite.ts")],
  outfile: path.join(distDir, "test", "suite.js"),
  plugins: [watchLog(), globModules],
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
  loader: { ".png": "dataurl" },
  entryPoints: [path.join(rootDir, "webview", "main.tsx")],
  outfile: path.join(distDir, "webview", "main.js"),
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isWatch ? "development" : "production",
    ),
  },
  plugins: [watchLog(buildCss)],
};

// The Assistant view and the component gallery share one CSS entry and the
// glob modules; each bundle emits its own `<entry>.css` for imported CSS.
const testbedWebviewOptions: BuildOptions = {
  ...webviewOptions,
  entryPoints: {
    main: path.join(rootDir, "webview", "main.tsx"),
    gallery: path.join(rootDir, "webview", "gallery", "main.tsx"),
  },
  outfile: undefined,
  outdir: path.join(distDir, "webview"),
  plugins: [...(webviewOptions.plugins ?? []), globModules, generativeUiStyle],
};

const allOptions = [hostOptions, testOptions, testbedWebviewOptions];

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
