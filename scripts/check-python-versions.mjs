#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./check-built-declarations.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const READ_PYPROJECT = `
import json, sys, tomllib
document = tomllib.loads(sys.stdin.read())
version = document.get("project", {}).pop("version", None)
print(json.dumps({"version": version, "rest": json.dumps(document, sort_keys=True, default=str)}))
`;

export function readPyproject(source) {
  return JSON.parse(
    execFileSync("python3", ["-c", READ_PYPROJECT], {
      input: source,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }),
  );
}

function lastErrorLine(error) {
  return (
    String(error.stderr ?? "")
      .trim()
      .split("\n")
      .at(-1) || error.message
  );
}

function runGit(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readProjectAt(root, ref, file) {
  if (runGit(root, ["ls-tree", "--name-only", ref, "--", file]) === "") {
    return undefined;
  }
  const source = runGit(root, ["show", `${ref}:${file}`]);
  try {
    return readPyproject(source);
  } catch (error) {
    throw new Error(`${file} at ${ref.slice(0, 9)}: ${lastErrorLine(error)}`);
  }
}

export function runPythonVersionCheck(root, baseSha, headSha) {
  try {
    const forkPoint = runGit(root, ["merge-base", baseSha, headSha]).trim();
    const packageFiles = runGit(root, [
      "diff",
      "--name-only",
      "--no-renames",
      "-z",
      `${baseSha}...${headSha}`,
      "--",
      "python/",
    ])
      .split("\0")
      .filter((file) => file.split("/").length > 2);
    const versionChanges = [];
    const otherChanges = [];
    for (const file of packageFiles) {
      const name = path.posix.basename(file);
      if (name === "uv.lock") continue;
      if (name === "pyproject.toml") {
        const before = readProjectAt(root, forkPoint, file);
        const after = readProjectAt(root, headSha, file);
        if (before && after) {
          if (before.version !== after.version) {
            versionChanges.push({
              file,
              from: before.version,
              to: after.version,
            });
          }
          if (before.rest === after.rest) continue;
        }
      }
      otherChanges.push(file);
    }
    return {
      versionChanges,
      mixedFiles: versionChanges.length === 0 ? [] : otherChanges,
    };
  } catch (error) {
    return { error: lastErrorLine(error) };
  }
}

function formatChange({ file, from, to }) {
  return `${file}: ${from} to ${to}`;
}

function main() {
  const { BASE_SHA, HEAD_SHA } = process.env;
  if (!BASE_SHA || !HEAD_SHA) {
    console.error("BASE_SHA and HEAD_SHA are required.");
    process.exit(1);
  }

  const result = runPythonVersionCheck(
    process.env.PYTHON_VERSION_CHECK_ROOT ?? repoRoot,
    BASE_SHA,
    HEAD_SHA,
  );
  if ("error" in result) {
    console.error(
      `Could not check ${BASE_SHA}...${HEAD_SHA}: ${result.error}. Failing instead of skipping the Python version check.`,
    );
    process.exit(1);
  }

  const { versionChanges, mixedFiles } = result;
  if (mixedFiles.length > 0) {
    console.error(
      "Python package versions changed in a PR that edits other Python package files:\n",
    );
    for (const change of versionChanges) {
      console.error(`  ${formatChange(change)}`);
    }
    console.error("\nOther Python package changes in this PR:\n");
    for (const file of mixedFiles) {
      console.error(`  ${file}`);
    }
    console.error(
      "\nA maintainer bumps a Python package version in a release PR that changes nothing in a package but that version and uv.lock files, right before publishing to PyPI.",
    );
    console.error("Revert the version in pyproject.toml and uv.lock.");
    process.exit(1);
  }

  console.log(
    versionChanges.length > 0
      ? `Python package versions change in a release-only diff. (${versionChanges.map(formatChange).join(", ")})`
      : "No Python package version changed.",
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  main();
}
