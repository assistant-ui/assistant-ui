// Packs the appOS example apps into unsigned web bundles the Examples pages
// embed with <AppOSApp>. An unsigned bundle's identity is its URL, so it is
// served from the docs site itself: public/appos/<name>.<hash>.wbn. The
// hashed names land in generated/appos-examples.json for the pages to read.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pack } from "appos-host/pack";

const docs = fileURLToPath(new URL("..", import.meta.url));
const repo = join(docs, "../..");
const publicDir = join(docs, "public/appos");

/** Each example: its workspace package, and the folder it builds into. */
const EXAMPLES = [
  { name: "with-article-assistant", dir: "examples/with-article-assistant" },
];

await mkdir(publicDir, { recursive: true });
const existing = await readdir(publicDir);
const manifest = {};

for (const { name, dir } of EXAMPLES) {
  const dist = join(repo, dir, "dist");
  // turbo builds the example first (turbo.json); `next dev` on its own doesn't.
  if (!existsSync(join(dist, "index.html"))) {
    const { status } = spawnSync("pnpm", ["--filter", name, "build"], {
      cwd: repo,
      stdio: "inherit",
    });
    if (status !== 0) process.exit(status ?? 1);
  }
  for (const file of existing) {
    if (file.startsWith(`${name}.`) && file.endsWith(".wbn"))
      await rm(join(publicDir, file));
  }
  const { out, size, files } = await pack({
    dir: dist,
    out: join(publicDir, `${name}.[hash].wbn`),
  });
  manifest[name] = `/appos/${basename(out)}`;
  console.log(`packed ${dir} (${files} files, ${size} bytes) -> ${out}`);
}

await mkdir(join(docs, "generated"), { recursive: true });
await writeFile(
  join(docs, "generated/appos-examples.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
