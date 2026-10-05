import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, dirname, relative, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { uiAliases } from "../examples/bundle-shared/build.mjs";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examples = JSON.parse(
  await readFile(resolve(root, "scripts/example-bundles.json"), "utf8"),
);
const destination = resolve(root, "apps/docs/public/example-bundles");
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const example of examples) {
  const source = resolve(root, "examples", example.package);
  const artifact = resolve(source, "dist");
  const info = JSON.parse(
    await readFile(resolve(artifact, "build-info.json"), "utf8").catch(() => {
      throw new Error(`Build ${example.package} first: pnpm build:bundles`);
    }),
  );
  if (info.slug !== example.slug)
    throw new Error(`Stale preview artifact for ${example.slug}`);
  const target = resolve(destination, example.slug);
  await rm(target, { recursive: true, force: true });
  await cp(artifact, target, { recursive: true });
  const scratch = resolve(root, ".example-source", example.slug);
  await rm(scratch, { recursive: true, force: true });
  await mkdir(scratch, { recursive: true });
  await cp(resolve(source, "src"), resolve(scratch, "src"), {
    recursive: true,
    filter: (path) => !/\.test\.[cm]?[jt]sx?$/.test(path),
  });
  await cp(
    resolve(root, "examples/bundle-shared"),
    resolve(scratch, "shared"),
    {
      recursive: true,
      filter: (path) =>
        !path.includes("node_modules") &&
        !/\.test\.[cm]?[jt]sx?$/.test(path) &&
        !["package.json", "tsconfig.json", "README.md"].includes(
          basename(path),
        ),
    },
  );
  const uiRoot = resolve(root, "packages/ui/src");
  const uiFiles = (info.inputs ?? [])
    .map((path) => resolve(source, path))
    .filter((path) => path.startsWith(uiRoot + sep));
  for (const path of uiFiles) {
    const copy = resolve(scratch, "ui", relative(uiRoot, path));
    await mkdir(dirname(copy), { recursive: true });
    await cp(path, copy);
  }
  const aliases = uiAliases(resolve(scratch, "ui"));
  async function rewriteImports(directory) {
    for (const file of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, file.name);
      if (file.isDirectory()) await rewriteImports(path);
      else if (/\.[cm]?[jt]sx?$/.test(file.name)) {
        const shared = relative(
          dirname(path),
          resolve(scratch, "shared"),
        ).replaceAll("\\", "/");
        const content = (await readFile(path, "utf8")).replace(
          /(?:\.\.\/)+bundle-shared\//g,
          `${shared}/`,
        );
        const relocated = content.replace(
          /((?:from\s*|import\s*(?:\(\s*)?)(["']))(@\/[^"']+)\2/g,
          (match, prefixText, quote, specifier) => {
            const prefix = Object.keys(aliases).find(
              (prefix) =>
                specifier === prefix || specifier.startsWith(prefix + "/"),
            );
            if (!prefix) throw new Error(`Unknown kit alias ${specifier}`);
            const target = aliases[prefix] + specifier.slice(prefix.length);
            const local = relative(dirname(path), target).replaceAll("\\", "/");
            return (
              prefixText +
              (local.startsWith(".") ? local : `./${local}`) +
              quote
            );
          },
        );
        await writeFile(path, relocated);
      }
    }
  }
  await rewriteImports(resolve(scratch, "src"));
  await rewriteImports(resolve(scratch, "shared"));
  if (uiFiles.length) await rewriteImports(resolve(scratch, "ui"));
  const pkg = JSON.parse(
    await readFile(resolve(source, "package.json"), "utf8"),
  );
  const all = {
    ...pkg.dependencies,
    ...JSON.parse(
      await readFile(
        resolve(root, "examples/bundle-shared/package.json"),
        "utf8",
      ),
    ).dependencies,
  };
  const kit = JSON.parse(
    await readFile(resolve(root, "packages/ui/package.json"), "utf8"),
  );
  for (const path of uiFiles) {
    const content = await readFile(path, "utf8");
    for (const [, specifier] of content.matchAll(
      /(?:from\s*|import\s*)["']([^"']+)["']/g,
    )) {
      if (specifier.startsWith(".") || specifier.startsWith("@/")) continue;
      const name = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      if (kit.dependencies[name]) all[name] = kit.dependencies[name];
    }
  }
  delete all["bundle-shared"];
  for (const [name, version] of Object.entries(all)) {
    if (version.startsWith("workspace:")) {
      const namePath = name.replace("@assistant-ui/", "");
      const local = JSON.parse(
        await readFile(
          resolve(root, "packages", namePath, "package.json"),
          "utf8",
        ),
      );
      all[name] = `^${local.version}`;
    }
  }
  delete all["@assistant-ui/ui"];
  await writeFile(
    resolve(scratch, "package.json"),
    JSON.stringify(
      {
        name: example.package,
        private: true,
        type: "module",
        scripts: { build: "node build.mjs", preview: "npx serve dist" },
        dependencies: all,
        devDependencies: {
          esbuild: "^0.28.2",
          postcss: "^8.5.28",
          "@tailwindcss/postcss": "^4.3.3",
          tailwindcss: "^4.3.3",
          "tw-animate-css": "^1.4.0",
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    resolve(scratch, "build.mjs"),
    `import {buildPreview} from "./shared/build.mjs";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
await mkdir("dist",{recursive:true});
await buildPreview({stdin:{contents:'import React from "react";import{createRoot}from"react-dom/client";import App from"./src/main.tsx";import"./shared/styles.css";createRoot(document.getElementById("root")).render(React.createElement(App));',resolveDir:process.cwd(),loader:"tsx"},bundle:true,outfile:"dist/app.js",jsx:"automatic",format:"esm",minify:true,metafile:true,define:{"process.env.NODE_ENV":'"production"'}},{uiRoot:resolve("ui"),sources:[resolve("ui"),resolve("shared"),resolve("src")]});
await writeFile("dist/index.html",'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>');`,
  );
  await cp(resolve(source, "README.md"), resolve(scratch, "README.md"));
  const sourceFiles = [
    "src/main.tsx",
    "shared/chat.tsx",
    "shared/transport.ts",
    "ui/components/react/assistant-ui/elements/thread.aui.tsx",
    ...(example.sourceFiles ?? []),
  ];
  await writeFile(
    resolve(target, "source.json"),
    JSON.stringify(
      await Promise.all(
        sourceFiles.map(async (path) => ({
          path,
          content: await readFile(resolve(scratch, path), "utf8"),
        })),
      ),
    ),
  );
  execFileSync("tar", [
    "-czf",
    resolve(target, "source.tar.gz"),
    "-C",
    scratch,
    ".",
  ]);
  await rm(scratch, { recursive: true, force: true });
}
console.log(
  `Packaged ${examples.length} independently built example artifacts.`,
);
