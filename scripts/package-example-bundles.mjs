import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examples = JSON.parse(
  await readFile(resolve(root, "scripts/example-bundles.json"), "utf8"),
);
const destination = resolve(root, "apps/docs/public/example-bundles");
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
  });
  await cp(
    resolve(root, "examples/bundle-shared"),
    resolve(scratch, "shared"),
    {
      recursive: true,
      filter: (path) =>
        !path.includes("node_modules") &&
        !["package.json", "tsconfig.json"].includes(basename(path)),
    },
  );
  async function rewriteImports(directory) {
    for (const file of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, file.name);
      if (file.isDirectory()) await rewriteImports(path);
      else if (/\.[cm]?[jt]sx?$/.test(file.name)) {
        const shared = relative(
          dirname(path),
          resolve(scratch, "shared"),
        ).replaceAll("\\", "/");
        const cursor = relative(
          dirname(path),
          resolve(scratch, "src/agent-cursor"),
        ).replaceAll("\\", "/");
        const content = (await readFile(path, "utf8"))
          .replace(/(?:\.\.\/)+bundle-shared\//g, `${shared}/`)
          .replace(
            /(?:\.\.\/)+packages\/ui\/src\/components\/react\/ui\/base\/agent-cursor/g,
            cursor.startsWith(".") ? cursor : `./${cursor}`,
          );
        await writeFile(path, content);
      }
    }
  }
  if (example.package === "bundle-website-agent")
    await cp(
      resolve(
        root,
        "packages/ui/src/components/react/ui/base/agent-cursor.tsx",
      ),
      resolve(scratch, "src/agent-cursor.tsx"),
    );
  await rewriteImports(resolve(scratch, "src"));
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
        devDependencies: { esbuild: "^0.28.2" },
      },
      null,
      2,
    ),
  );
  await writeFile(
    resolve(scratch, "build.mjs"),
    `import {build} from "esbuild";import {mkdir,writeFile} from "node:fs/promises";await mkdir("dist",{recursive:true});await build({stdin:{contents:'import React from "react";import{createRoot}from"react-dom/client";import App from"./src/main.tsx";import"./shared/styles.css";createRoot(document.getElementById("root")).render(React.createElement(App));',resolveDir:process.cwd(),loader:"tsx"},bundle:true,outfile:"dist/app.js",jsx:"automatic",format:"esm",minify:true,define:{"process.env.NODE_ENV":'"production"'}});await writeFile("dist/index.html",'<html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script type="module" src="app.js"></script></body></html>');`,
  );
  await cp(resolve(source, "README.md"), resolve(scratch, "README.md"));
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
