#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { isExecutedAsMain } from "./lib/main.mjs";

const isPackageJson = (file) => path.posix.basename(file) === "package.json";
const isChangelog = (file) => path.posix.basename(file) === "CHANGELOG.md";
const isChangeset = (file) => /^\.changeset\/(?:pre\/)?[^/]+\.md$/.test(file);
const isModifiable = (file) =>
  isPackageJson(file) ||
  isChangelog(file) ||
  file === "pnpm-lock.yaml" ||
  file === ".changeset/pre.json";

const dependencyFields = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];
const isVersion = (value) =>
  typeof value === "string" &&
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
const rewrittenRange = (range, version) => {
  const workspace = range.startsWith("workspace:") ? "workspace:" : "";
  const operator =
    /^(?:[\^~]|[<>]=|>)/.exec(range.slice(workspace.length))?.[0] ?? "";
  return `${workspace}${operator}${version}`;
};
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readNumstat = (output) => {
  const fields = output.split("\0");
  const records = [];
  for (let index = 0; index < fields.length - 1; index += 1) {
    const [added, deleted, file] = fields[index].split("\t");
    if (file === "") {
      records.push({
        added,
        deleted,
        file: fields[index + 1],
        renamedTo: fields[index + 2],
      });
      index += 2;
    } else {
      records.push({ added, deleted, file });
    }
  }
  return records;
};

const parseObject = (text) => {
  try {
    const value = JSON.parse(text);
    return isObject(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

function checkManifests(manifests) {
  const problems = [];
  const released = new Map();
  for (const { file, before, after } of manifests) {
    if (before === undefined || after === undefined) {
      problems.push(`The version patch makes ${file} invalid JSON`);
    } else if (before.version !== after.version) {
      if (isVersion(after.version)) {
        released.set(after.name, after.version);
      } else {
        problems.push(`The version patch sets an invalid version in ${file}`);
      }
    }
  }

  for (const { file, before, after } of manifests) {
    if (before === undefined || after === undefined) continue;
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ])) {
      if (key === "version") continue;
      const was = before[key];
      const now = after[key];
      if (!dependencyFields.includes(key) || !isObject(was) || !isObject(now)) {
        if (!isDeepStrictEqual(was, now)) {
          problems.push(`The version patch changes ${key} in ${file}`);
        }
        continue;
      }
      for (const name of new Set([...Object.keys(was), ...Object.keys(now)])) {
        if (was[name] === now[name]) continue;
        const version = released.get(name);
        if (
          version !== undefined &&
          typeof was[name] === "string" &&
          now[name] === rewrittenRange(was[name], version)
        ) {
          continue;
        }
        problems.push(`The version patch changes ${key}.${name} in ${file}`);
      }
    }
  }
  return problems;
}

export function checkVersionPatch(patch, { cwd = process.cwd() } = {}) {
  const git = (args, env) =>
    execFileSync("git", args, { cwd, encoding: "utf8", env });
  try {
    git(["apply", "--check", patch]);
  } catch {
    return ["The version patch does not apply to this commit."];
  }

  const problems = [];
  const created = new Set();
  const deleted = new Set();
  const createdOrDeleted = new Set();
  for (const line of git(["apply", "--summary", patch]).split("\n")) {
    const entry = line.trim();
    if (entry === "") continue;
    const change = /^(create|delete) mode (\d+) (.+)$/.exec(entry);
    if (!change) {
      problems.push(`The version patch makes an unexpected change: ${entry}`);
      continue;
    }
    createdOrDeleted.add(change[3]);
    if (
      change[1] === "create" &&
      change[2] === "100644" &&
      isChangelog(change[3])
    ) {
      created.add(change[3]);
    } else if (change[1] === "delete" && isChangeset(change[3])) {
      deleted.add(change[3]);
    } else {
      problems.push(`The version patch may not ${change[1]} ${change[3]}`);
    }
  }

  const manifestFiles = [];
  for (const record of readNumstat(git(["apply", "--numstat", "-z", patch]))) {
    if (record.renamedTo !== undefined) {
      problems.push(
        `The version patch renames ${record.file} to ${record.renamedTo}`,
      );
    } else if (record.added === "-" || record.deleted === "-") {
      problems.push(`The version patch changes binary file ${record.file}`);
    } else if (
      !deleted.has(record.file) &&
      !created.has(record.file) &&
      !isModifiable(record.file)
    ) {
      problems.push(`The version patch changes ${record.file}`);
    } else if (
      isPackageJson(record.file) &&
      !createdOrDeleted.has(record.file)
    ) {
      manifestFiles.push(record.file);
    }
  }
  if (manifestFiles.length === 0) return problems;

  const indexDir = mkdtempSync(path.join(tmpdir(), "version-patch-"));
  try {
    const env = {
      ...process.env,
      GIT_INDEX_FILE: path.join(indexDir, "index"),
    };
    git(["read-tree", "HEAD"], env);
    git(["apply", "--cached", patch], env);
    const manifests = manifestFiles.map((file) => ({
      file,
      before: parseObject(git(["show", `HEAD:${file}`])),
      after: parseObject(git(["show", `:${file}`], env)),
    }));
    return [...problems, ...checkManifests(manifests)];
  } finally {
    rmSync(indexDir, { recursive: true, force: true });
  }
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const problems = checkVersionPatch(process.argv[2]);
  if (problems.length > 0) {
    for (const problem of problems) console.log(`::error::${problem}`);
    process.exitCode = 1;
  } else {
    console.log(
      "The version patch only touches files changeset version writes.",
    );
  }
}
