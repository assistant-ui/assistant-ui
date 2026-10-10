import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { rolldown } from "rolldown";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

/** Maps every `generative-frame/*` export to its source entry. */
const sourceEntries = () => {
  const entries = {};
  for (const key of Object.keys(pkg.exports)) {
    const name = key === "." ? "index" : key.slice(2);
    const dist = pkg.exports[key].default;
    const src = dist.replace(/^\.\/dist\//, "src/").replace(/\.js$/, "");
    entries[key === "." ? pkg.name : `${pkg.name}/${name}`] = join(root, src);
  }
  return entries;
};

const EXTERNAL = [/^react($|\/)/, /^react-dom($|\/)/, /^@assistant-ui\//];

/**
 * Bundles a fixture the way an app would (minified ESM, React external) and
 * returns its size and the source modules it contains, relative to the repo.
 */
export async function bundleFixture(fixture) {
  const entries = sourceEntries();
  const bundle = await rolldown({
    input: join(root, "scripts/bundle-fixtures", fixture),
    external: (id) => EXTERNAL.some((pattern) => pattern.test(id)),
    resolve: { extensions: [".ts", ".tsx", ".js", ".mjs"] },
    plugins: [
      {
        name: "generative-frame-source",
        resolveId(id) {
          const target = entries[id];
          if (!target) return null;
          for (const ext of [".ts", ".tsx"]) {
            try {
              readFileSync(target + ext);
              return target + ext;
            } catch {}
          }
          return null;
        },
      },
    ],
    logLevel: "silent",
  });
  const { output } = await bundle.generate({ format: "esm", minify: true });
  await bundle.close();
  const code = output
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => chunk.code)
    .join("\n");
  const modules = output
    .filter((chunk) => chunk.type === "chunk")
    .flatMap((chunk) => chunk.moduleIds)
    .map((id) => relative(join(root, "../.."), id.replace(/^\0/, "")));
  return {
    modules,
    bytes: Buffer.byteLength(code),
    gzip: gzipSync(code).length,
  };
}

if (process.argv[2]) {
  for (const fixture of process.argv.slice(2)) {
    const { modules, bytes, gzip } = await bundleFixture(fixture);
    console.log(
      `${fixture}: ${(bytes / 1024).toFixed(1)} kB min, ${(gzip / 1024).toFixed(1)} kB min+gzip, ${modules.length} modules`,
    );
    if (process.env.LIST) console.log(modules.join("\n"));
  }
}
