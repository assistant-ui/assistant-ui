import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPreview } from "../examples/bundle-shared/build.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cwd = process.cwd();
const manifest = JSON.parse(
  await readFile(resolve(root, "scripts/example-bundles.json"), "utf8"),
);
const pkg = JSON.parse(await readFile(resolve(cwd, "package.json"), "utf8"));
const example = manifest.find((entry) => entry.package === pkg.name);
if (!example) throw new Error(`No preview manifest entry for ${pkg.name}`);
const outdir = resolve(cwd, "dist");
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
const started = performance.now();
const result = await buildPreview(
  {
    stdin: {
      contents: `import React from "react"; import {createRoot} from "react-dom/client"; import App from ${JSON.stringify("./" + example.entry)}; import "../bundle-shared/styles.css"; const params = new URLSearchParams(location.search); if(params.get("theme") === "dark") document.documentElement.dataset.theme = "dark"; if(params.get("view") === "card") document.documentElement.dataset.preview = "card"; createRoot(document.getElementById("root")).render(React.createElement(App));`,
      resolveDir: cwd,
      sourcefile: "preview.tsx",
      loader: "tsx",
    },
    outdir,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    jsx: "automatic",
    minify: true,
    metafile: true,
    target: "es2022",
    entryNames: "assets/preview-[hash]",
    chunkNames: "assets/chunk-[hash]",
    nodePaths: [
      resolve(cwd, "node_modules"),
      resolve(root, "examples/bundle-shared/node_modules"),
      resolve(root, "packages/ui/node_modules"),
    ],
    define: {
      "process.env.NODE_ENV": '"production"',
      __AUI_PACKAGE_VERSION__: '"0.0.0"',
    },
    logLevel: "warning",
  },
  {
    uiRoot: resolve(root, "packages/ui/src"),
    sources: [
      resolve(root, "packages/ui/src/components/react"),
      resolve(root, "examples/bundle-shared"),
      resolve(cwd, "src"),
    ],
  },
);
const outputs = Object.entries(result.metafile.outputs);
const script = outputs.find(([, output]) => output.entryPoint)?.[0];
if (!script) throw new Error("Preview build produced no entry");
const css = outputs.find(([name]) => name.endsWith(".css"))?.[0];
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
await writeFile(
  resolve(outdir, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(example.title)}</title>${css ? `<link rel="stylesheet" href="./${relative(outdir, resolve(css))}">` : ""}</head><body><div id="root"></div><script type="module" src="./${relative(outdir, resolve(script))}"></script></body></html>`,
);
await writeFile(
  resolve(outdir, "build-info.json"),
  JSON.stringify(
    {
      package: pkg.name,
      slug: example.slug,
      elapsedMs: Math.round(performance.now() - started),
      inputs: Object.keys(result.metafile.inputs),
      bytes: outputs.reduce((sum, [, output]) => sum + output.bytes, 0),
    },
    null,
    2,
  ),
);
console.log(
  `${pkg.name}: ${Math.round(performance.now() - started)}ms, ${outputs.reduce((sum, [, output]) => sum + output.bytes, 0)} bytes`,
);
