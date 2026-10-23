#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";

const readPlan = (packDir) =>
  JSON.parse(fs.readFileSync(path.join(packDir, "publish-plan.json"), "utf8"));

const listEntries = (tarball) =>
  execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

const readManifest = (tarball) =>
  JSON.parse(
    execFileSync("tar", ["-xzOf", tarball, "package/package.json"], {
      encoding: "utf8",
    }),
  );

// pnpm normalizes tarball entry paths and publishes the last entry that
// resolves to package/package.json, so every name must already be canonical
// and unique for the manifest read here to be the one pnpm publishes.
const isCanonicalEntry = (name) => {
  const segments = name.split("/");
  return (
    !name.includes("\\") &&
    segments[0] === "package" &&
    segments.every(
      (segment) => segment !== "" && segment !== "." && segment !== "..",
    )
  );
};

const checkTarball = (packDir, release, label, problems) => {
  const tarball = path.resolve(packDir, String(release.tarball?.path));
  if (
    path.dirname(path.relative(packDir, tarball)) !== "packages" ||
    !fs.existsSync(tarball) ||
    !fs.lstatSync(tarball).isFile()
  ) {
    problems.push(
      `${label} points at ${release.tarball?.path}, not a packed file`,
    );
    return;
  }

  const names = new Set();
  for (const entry of listEntries(tarball)) {
    const name = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    if (!isCanonicalEntry(name) || names.has(name)) {
      problems.push(
        `${label} has an entry pnpm could read under another path: ${entry}`,
      );
    }
    names.add(name);
  }

  let manifest;
  try {
    manifest = readManifest(tarball);
  } catch {
    problems.push(`${label} has no readable package/package.json`);
    return;
  }
  if (manifest.name !== release.name || manifest.version !== release.version) {
    problems.push(`${label} contains ${manifest.name}@${manifest.version}`);
  }
};

export async function checkPackedRelease({ packDir, targets, isPublished }) {
  const packed = readPlan(packDir);
  if (packed.version !== 1 || !Array.isArray(packed.plan)) {
    return { problems: ["The packed publish plan has an unexpected format."] };
  }

  const expected = new Map(targets.map(({ name, version }) => [name, version]));
  const problems = [];
  const planned = new Set();
  for (const release of packed.plan.flat()) {
    const label = `${release.name}@${release.version}`;
    if (release.kind !== "publish") {
      problems.push(`${label} is a ${release.kind} entry`);
      continue;
    }
    if (expected.get(release.name) !== release.version) {
      problems.push(`${label} is not a release target`);
      continue;
    }
    if (planned.has(release.name)) {
      problems.push(`${release.name} is planned twice`);
      continue;
    }
    planned.add(release.name);
    if (release.tag !== "latest" || release.access !== "public") {
      problems.push(
        `${label} would publish with tag ${release.tag} and access ${release.access}`,
      );
    }
    checkTarball(packDir, release, label, problems);
  }

  // The plan was fixed before the publish lock was taken, so a target an
  // earlier run published since is skipped instead of retried.
  const published = new Set();
  for (const { name, version } of targets) {
    if (await isPublished(name, version)) {
      published.add(name);
    } else if (!planned.has(name)) {
      problems.push(`${name}@${version} is not packed`);
    }
  }

  const plan = packed.plan
    .map((chunk) => chunk.filter((release) => !published.has(release.name)))
    .filter((chunk) => chunk.length > 0);
  return {
    problems,
    document: { ...packed, plan },
    checked: planned.size,
    skipped: published.size,
  };
}

const isPublishedOnNpm = async (name, version) => {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(name)}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(
      `npm metadata for ${name} returned HTTP ${response.status}`,
    );
  }
  return Boolean((await response.json()).versions?.[version]);
};

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const packDir = path.resolve(process.env.PACK_DIR ?? "");
  const result = await checkPackedRelease({
    packDir,
    targets: JSON.parse(process.env.TARGETS_JSON ?? "[]"),
    isPublished: isPublishedOnNpm,
  });
  if (result.problems.length > 0) {
    console.log("The packed packages do not match the release targets:");
    for (const problem of result.problems) console.log(`::error::${problem}`);
    process.exitCode = 1;
  } else {
    fs.writeFileSync(
      path.join(packDir, "publish-plan.json"),
      JSON.stringify(result.document),
    );
    console.log(
      `Checked ${result.checked} packed packages against the release targets; ${result.skipped} already on npm are skipped.`,
    );
  }
}
