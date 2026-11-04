// Builds the standalone runtime files into dist/script/:
//   rc-runtime.js       core, one classic script (what pages and the serving layer add)
//   rc-overlays.js      overlays, loaded on first use
//   rc-cq.js            host container query emulation, loaded when needed
//   rc-runtime.full.js  everything in one script (for inlining: srcdoc, SCF)
// and dist/source.js, which exports the full build as a string for hosts
// that inline the runtime (`html` prop).
//   node build-script.mjs [--size]
import { build } from "vite";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "src");
const out = path.join(here, "dist/script");
const pkg = JSON.parse(
  (await import("node:fs")).readFileSync(
    path.join(here, "package.json"),
    "utf8",
  ),
);

/** Builds one IIFE. `split`: chunks.ts → chunks-script.ts (load chunks by URL). */
async function iife(entry, { split }) {
  const res = await build({
    configFile: false,
    logLevel: "silent",
    root: here,
    plugins: split
      ? [
          {
            name: "rc-split-chunks",
            enforce: "pre",
            resolveId(id, importer) {
              if (id === "./chunks.js" && importer?.startsWith(src))
                return path.join(src, "chunks-script.ts");
              return null;
            },
          },
        ]
      : [],
    build: {
      write: false,
      minify: true,
      target: "es2022",
      lib: {
        entry: path.join(src, entry),
        formats: ["iife"],
        name: "rcRuntime",
        fileName: () => "x.js",
      },
    },
  });
  const code = (Array.isArray(res) ? res : [res])
    .flatMap((o) => o.output)
    .map((c) => c.code ?? "")
    .join("");
  // The IIFE wrapper assigns a global we do not need.
  return `/* @assistant-ui/remote-components-runtime ${pkg.version} */\n${code.replace(/^var rcRuntime=/, "")}`;
}

mkdirSync(out, { recursive: true });
const files = {
  "rc-runtime.js": await iife("script.ts", { split: true }),
  "rc-overlays.js": await iife("chunk-overlays.ts", { split: true }),
  "rc-cq.js": await iife("chunk-cq.ts", { split: true }),
  "rc-runtime.full.js": await iife("script.ts", { split: false }),
};
for (const [name, code] of Object.entries(files))
  writeFileSync(path.join(out, name), code);
writeFileSync(
  path.join(here, "dist/source.js"),
  `/** The full standalone runtime (rc-runtime.full.js) as a string, for hosts that inline it. */\nexport const RUNTIME_VERSION = ${JSON.stringify(pkg.version)};\nexport const RUNTIME_SOURCE = ${JSON.stringify(files["rc-runtime.full.js"])};\n`,
);
writeFileSync(
  path.join(here, "dist/source.d.ts"),
  `export declare const RUNTIME_VERSION: string;\nexport declare const RUNTIME_SOURCE: string;\n`,
);
// `@assistant-ui/remote-components-runtime/global`: types the global `rc` (and `window.rc`) without an import.
writeFileSync(
  path.join(here, "dist/global.d.ts"),
  `/// <reference path="./rc.d.ts" />\n`,
);

if (process.argv.includes("--size")) {
  for (const [name, code] of Object.entries(files)) {
    const b = Buffer.from(code);
    console.log(
      `${name.padEnd(22)} ${(b.length / 1024).toFixed(1).padStart(6)} KB  ${(gzipSync(b, { level: 9 }).length / 1024).toFixed(1).padStart(5)} KB gzip  ${(brotliCompressSync(b).length / 1024).toFixed(1).padStart(5)} KB br`,
    );
  }
}
