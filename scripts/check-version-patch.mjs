#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";

const isPackageJson = (file) => path.posix.basename(file) === "package.json";
const isChangelog = (file) => path.posix.basename(file) === "CHANGELOG.md";
const isChangeset = (file) => /^\.changeset\/(?:pre\/)?[^/]+\.md$/.test(file);
const isModifiable = (file) =>
  isPackageJson(file) ||
  isChangelog(file) ||
  file === "pnpm-lock.yaml" ||
  file === ".changeset/pre.json";

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

export function checkVersionPatch(patch, { cwd = process.cwd() } = {}) {
  const git = (args) => execFileSync("git", args, { cwd, encoding: "utf8" });
  try {
    git(["apply", "--check", patch]);
  } catch {
    return ["The version patch does not apply to this commit."];
  }

  const problems = [];
  const created = new Set();
  const deleted = new Set();
  for (const line of git(["apply", "--summary", patch]).split("\n")) {
    const entry = line.trim();
    if (entry === "") continue;
    const change = /^(create|delete) mode (\d+) (.+)$/.exec(entry);
    if (!change) {
      problems.push(`The version patch makes an unexpected change: ${entry}`);
    } else if (
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
    }
  }
  return problems;
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
