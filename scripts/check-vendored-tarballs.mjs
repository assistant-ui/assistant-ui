import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

// Each directory ships its archives inside the published CLI. This check keeps
// the archives and provenance.json in step: every archive is recorded, every
// recorded archive exists with the recorded sha256, and the template's
// package.json points only at recorded archives under their recorded names.
// It does not prove an archive was built from the recorded harness-sdk
// revision, since a change can update an archive and its hash together; the
// review policy routes changes under these directories to CI and policy
// owners for that. Rebuild with scripts/package-cloud-harness-template.mjs.
export const VENDOR_DIRECTORIES = ["templates/cloud-harness/vendor"];

export function findVendorProblems(root, directory) {
  const problems = [];
  const vendor = path.join(root, directory);
  let provenance;
  try {
    provenance = JSON.parse(
      readFileSync(path.join(vendor, "provenance.json"), "utf8"),
    );
  } catch (error) {
    return [`${directory}/provenance.json: ${error.message}`];
  }
  const artifacts = Array.isArray(provenance.artifacts)
    ? provenance.artifacts
    : [];
  if (artifacts.length === 0) {
    problems.push(`${directory}/provenance.json lists no artifacts`);
  }

  const recorded = new Set();
  for (const artifact of artifacts) {
    const { filename, sha256, name, version } = artifact ?? {};
    if (
      typeof filename !== "string" ||
      filename !== path.basename(filename) ||
      !filename.endsWith(".tgz")
    ) {
      problems.push(
        `${directory}/provenance.json has an artifact with an invalid filename: ${JSON.stringify(filename)}`,
      );
      continue;
    }
    recorded.add(filename);
    const label = `${directory}/${filename}`;
    let archive;
    try {
      archive = readFileSync(path.join(vendor, filename));
    } catch {
      problems.push(`${label} is recorded in provenance.json but missing`);
      continue;
    }
    const actual = createHash("sha256").update(archive).digest("hex");
    if (actual !== sha256) {
      problems.push(
        `${label} has sha256 ${actual}, but provenance.json records ${sha256}`,
      );
    }
    if (
      typeof name !== "string" ||
      typeof version !== "string" ||
      name === "" ||
      version === ""
    ) {
      problems.push(`${label} has no name and version in provenance.json`);
    }
  }

  for (const file of readdirSync(vendor)) {
    if (file.endsWith(".tgz") && !recorded.has(file)) {
      problems.push(`${directory}/${file} is not recorded in provenance.json`);
    }
  }

  const manifestPath = path.join(path.dirname(vendor), "package.json");
  let templateManifest;
  try {
    templateManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    problems.push(`${path.relative(root, manifestPath)}: ${error.message}`);
    return problems;
  }
  const vendorName = path.basename(vendor);
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const [dependency, spec] of Object.entries(
      templateManifest[field] ?? {},
    )) {
      if (typeof spec !== "string") continue;
      // npm reads `file:` specs and anything starting with `.`, `~/`, a slash
      // or a drive letter as a local path; pnpm adds `link:`.
      const protocol = /^(?:file|link):/.exec(spec)?.[0];
      const local = protocol
        ? spec.slice(protocol.length)
        : /^(?:\.|~\/|[/\\]|[a-zA-Z]:)/.test(spec)
          ? spec
          : undefined;
      if (local === undefined) continue;
      const target = path.posix.normalize(local.replaceAll("\\", "/"));
      const filename = target.startsWith(`${vendorName}/`)
        ? target.slice(vendorName.length + 1)
        : undefined;
      if (!filename || !recorded.has(filename)) {
        problems.push(
          `${path.relative(root, manifestPath)} ${field}.${dependency} points at ${spec}, which provenance.json does not record`,
        );
        continue;
      }
      const artifact = artifacts.find((entry) => entry?.filename === filename);
      if (artifact.name !== dependency) {
        problems.push(
          `${path.relative(root, manifestPath)} ${field}.${dependency} points at ${filename}, which provenance.json records as ${artifact.name}`,
        );
      }
    }
  }
  return problems;
}

export function runCheck(root = repoRoot, directories = VENDOR_DIRECTORIES) {
  const problems = directories.flatMap((directory) =>
    findVendorProblems(root, directory),
  );
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error(
      "\nRegenerate the archives and provenance.json with scripts/package-cloud-harness-template.mjs.",
    );
    return false;
  }
  console.log(
    `Vendored archives match their provenance in ${directories.join(", ")}.`,
  );
  return true;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  if (!runCheck(process.env.VENDORED_TARBALLS_CHECK_ROOT)) {
    process.exitCode = 1;
  }
}
