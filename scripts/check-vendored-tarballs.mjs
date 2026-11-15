import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { isExecutedAsMain } from "./lib/main.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

// Each directory ships its archives inside the published CLI, so every archive
// must match the hash, name and version its provenance file records, and the
// template's manifest may point only at recorded archives.
export const VENDOR_DIRECTORIES = ["templates/cloud-harness/vendor"];

// npm pack writes plain files and directories with short paths. Extension
// headers (pax, GNU long names) can rename the entry that follows them, so an
// archive with one is rejected rather than read with different path rules.
const PLAIN_ENTRY_TYPES = new Set(["0", "\0", "5"]);

/** The parsed `package/package.json` inside an npm-packed `.tgz`. */
export function readPackedManifest(archive) {
  const tar = gunzipSync(archive);
  let manifest;
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    // node-tar ends the archive only at two empty blocks in a row and keeps
    // reading after a single one, so an entry after one empty block counts.
    if (header.every((byte) => byte === 0)) {
      const next = tar.subarray(offset + 512, offset + 1024);
      if (next.length === 512 && !next.every((byte) => byte === 0)) {
        throw new Error("it has an entry after an empty block");
      }
      break;
    }
    // An extractor may skip a header with a bad checksum and read the next
    // one, so the entries it sees could differ from the ones read here.
    let sum = 0;
    for (let index = 0; index < 512; index += 1) {
      sum += index >= 148 && index < 156 ? 0x20 : header[index];
    }
    const checksum = header
      .subarray(148, 156)
      .toString("latin1")
      .replace(/[\0 ]+$/, "");
    if (!/^[0-7]+$/.test(checksum) || Number.parseInt(checksum, 8) !== sum) {
      throw new Error("it has a tar header with a bad checksum");
    }
    const field = (start, length) =>
      header
        .subarray(start, start + length)
        .toString("utf8")
        .replace(/\0.*$/s, "");
    const prefix = field(345, 155);
    const name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);
    // npm pack writes POSIX ustar headers. GNU and v7 headers give bytes
    // 345-499 another meaning, so the path read here could differ from the
    // one an extractor uses.
    if (header.subarray(257, 265).toString("latin1") !== "ustar\u000000") {
      throw new Error("it has a non-POSIX tar header");
    }
    const type = String.fromCharCode(header[156]);
    if (!PLAIN_ENTRY_TYPES.has(type)) {
      throw new Error(
        `it has an unsupported tar entry type ${JSON.stringify(type)}`,
      );
    }
    const sizeField = field(124, 12).trim() || "0";
    if (!/^[0-7]+$/.test(sizeField)) {
      throw new Error(
        `it has an invalid entry size ${JSON.stringify(sizeField)}`,
      );
    }
    const size = Number.parseInt(sizeField, 8);
    const body = offset + 512;
    const end = body + Math.ceil(size / 512) * 512;
    if (end > tar.length) throw new Error("it is truncated");
    // npm pack writes canonical names under package/, so any other spelling
    // (./, .., doubled or trailing slashes, backslashes) is rejected rather
    // than guessed at.
    const canonical = type === "5" ? name.replace(/\/$/, "") : name;
    if (
      name.includes("\\") ||
      canonical.endsWith("/") ||
      path.posix.normalize(canonical) !== canonical ||
      !canonical.startsWith("package/")
    ) {
      throw new Error(
        `it has a non-canonical entry name ${JSON.stringify(name)}`,
      );
    }
    // An extractor keeps the last copy of a repeated path, so a second
    // manifest could differ from the one checked here.
    if (name === "package/package.json") {
      if (type === "5")
        throw new Error("its package/package.json is a directory");
      if (manifest !== undefined) {
        throw new Error("it contains more than one package/package.json");
      }
      manifest = JSON.parse(tar.subarray(body, body + size).toString("utf8"));
    }
    offset = end;
  }
  return manifest;
}

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
    let manifest;
    try {
      manifest = readPackedManifest(archive);
    } catch (error) {
      problems.push(`${label} is not a readable npm archive: ${error.message}`);
      continue;
    }
    if (!manifest) {
      problems.push(`${label} has no package/package.json`);
    } else if (
      typeof name !== "string" ||
      typeof version !== "string" ||
      name === "" ||
      version === ""
    ) {
      problems.push(`${label} has no name and version in provenance.json`);
    } else if (manifest.name !== name || manifest.version !== version) {
      problems.push(
        `${label} packs ${manifest.name}@${manifest.version}, but provenance.json records ${name}@${version}`,
      );
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
      if (typeof spec !== "string" || !spec.startsWith("file:")) continue;
      const target = spec.slice("file:".length).replace(/^\.\//, "");
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
