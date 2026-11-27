import { execFileSync } from "node:child_process";
import { hash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
  // Turbo builds this prerequisite for docs build and dev. Direct pnpm runs need it too.
  if (!process.env.TURBO_HASH) {
    execFileSync(
      process.execPath,
      [
        fileURLToPath(import.meta.resolve("turbo")),
        "run",
        "build:appos",
        "--filter",
        name,
      ],
      { cwd: repo, stdio: "inherit" },
    );
  }
  const bundle = await readFile(join(repo, dir, ".next-appos/example.wbn"));
  const filename = `${name}.${hash("sha256", bundle).slice(0, 12)}.wbn`;
  await writeFile(join(publicDir, filename), bundle);
  manifest[name] = `/appos/${filename}`;
  for (const file of existing) {
    if (
      file !== filename &&
      file.startsWith(`${name}.`) &&
      file.endsWith(".wbn")
    )
      await rm(join(publicDir, file));
  }
}

await mkdir(join(docs, "generated"), { recursive: true });
await writeFile(
  join(docs, "generated/appos-examples.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
