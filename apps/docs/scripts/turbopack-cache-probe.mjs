// Experiment only: fingerprints .next/cache/turbopack so a build can tell
// whether the cache Vercel restored is byte-identical to the one the previous
// build uploaded.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const phase = process.argv[2];
const cacheDir = new URL("../.next/cache/turbopack", import.meta.url).pathname;
const manifestPath = new URL(
  "../.next/cache/turbopack-probe-manifest.json",
  import.meta.url,
).pathname;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

function hashFile(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha1");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

async function fingerprint() {
  const files = {};
  if (!existsSync(cacheDir)) return files;
  for await (const path of walk(cacheDir)) {
    const { size } = await stat(path);
    files[relative(cacheDir, path)] = { size, sha1: await hashFile(path) };
  }
  return files;
}

const started = Date.now();
const files = await fingerprint();
const names = Object.keys(files).sort();
const bytes = names.reduce((sum, name) => sum + files[name].size, 0);
const digest = createHash("sha1")
  .update(names.map((name) => `${name} ${files[name].sha1}`).join("\n"))
  .digest("hex");
const log = (message) => console.log(`[cache-probe] ${phase}: ${message}`);

log(
  `files=${names.length} bytes=${bytes} digest=${digest} hashed in ${Date.now() - started}ms`,
);
for (const name of names.filter((name) => name.endsWith("CURRENT")))
  log(`${name} = ${JSON.stringify(readFileSync(join(cacheDir, name), "latin1"))}`);

if (phase === "restored") {
  if (!existsSync(manifestPath)) {
    log("no manifest from a previous build");
  } else {
    const previous = JSON.parse(readFileSync(manifestPath, "utf8"));
    log(`previous build uploaded digest=${previous.digest} files=${previous.count}`);
    const missing = Object.keys(previous.files).filter((name) => !files[name]);
    const added = names.filter((name) => !previous.files[name]);
    const changed = names.filter(
      (name) =>
        previous.files[name] && previous.files[name].sha1 !== files[name].sha1,
    );
    log(
      `${previous.digest === digest ? "IDENTICAL" : "DIFFERENT"} missing=${missing.length} added=${added.length} changed=${changed.length}`,
    );
    for (const name of [...missing, ...added, ...changed].slice(0, 50))
      log(
        `  ${missing.includes(name) ? "missing" : added.includes(name) ? "added" : "changed"} ${name}`,
      );
  }
}

if (phase === "final")
  writeFileSync(
    manifestPath,
    JSON.stringify({ digest, count: names.length, files }),
  );
