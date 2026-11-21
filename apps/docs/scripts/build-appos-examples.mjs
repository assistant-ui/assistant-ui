// Builds the appOS example apps and packs them into unsigned web bundles the
// Examples pages embed with <AppOSApp>. The examples are plain Next.js apps:
// appOS's build adapter (appos-host/next, set through NEXT_ADAPTER_PATH)
// writes each one's .next/appos/, an appOS app folder. An unsigned bundle's
// identity is its URL, so it is served from the docs site itself:
// public/appos/<name>.<hash>.wbn. The hashed names land in
// generated/appos-examples.json for the pages to read.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pack } from "appos-host/pack";

const adapter = createRequire(import.meta.url).resolve("appos-host/next");

const docs = fileURLToPath(new URL("..", import.meta.url));
const repo = join(docs, "../..");
const publicDir = join(docs, "public/appos");

/** Each example: its workspace package and folder. */
const EXAMPLES = [
  { name: "with-article-assistant", dir: "examples/with-article-assistant" },
];

await mkdir(publicDir, { recursive: true });
const existing = await readdir(publicDir);
const manifest = {};

for (const { name, dir } of EXAMPLES) {
  const dist = join(repo, dir, ".next/appos");
  // A plain `next build` (turbo's) clears .next/, so this builds again then.
  if (!existsSync(join(dist, "index.html"))) {
    const { status } = spawnSync(
      "pnpm",
      ["--filter", name, "exec", "next", "build"],
      {
        cwd: repo,
        stdio: "inherit",
        env: { ...process.env, NEXT_ADAPTER_PATH: adapter },
      },
    );
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
