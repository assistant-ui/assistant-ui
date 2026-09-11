#!/usr/bin/env node
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./check-built-declarations.mjs";
import { parseWorkspaceGlobs } from "./check-changesets.mjs";
import { posixPath, readJson } from "./lib/workspace.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const COURSE_PROJECT_GLOB =
  "apps/docs/lib/xulux/learn/courses/*/shared/project/package.json";

const VERSION_FIELDS = ["dependencies", "devDependencies"];

export function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function compareVersions(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function lowestSatisfying(range) {
  if (typeof range !== "string") return null;
  if (range.startsWith("workspace:") || range.includes("||")) return null;
  const alias = /^npm:(?:@[^/]+\/)?[^@]+@(.+)$/.exec(range);
  return parseVersion((alias ? alias[1] : range).replace(/^[\^~>=v\s]+/, ""));
}

export function parseIndentedBlock(source, key) {
  const entries = [];
  let depth = null;
  for (const line of source.split("\n")) {
    if (new RegExp(`^${key}:\\s*$`).test(line)) {
      depth = 0;
      continue;
    }
    if (depth === null) continue;
    if (/^\s*(?:#.*)?$/.test(line)) continue;
    if (/^\S/.test(line)) {
      depth = null;
      continue;
    }
    const entry = /^(\s+)(?:"([^"]*)"|'([^']*)'|([^\s#:]+))\s*:\s*(.*)$/.exec(
      line,
    );
    if (!entry) continue;
    if (depth === 0) depth = entry[1].length;
    if (entry[1].length !== depth) continue;
    entries.push([
      entry[2] ?? entry[3] ?? entry[4],
      entry[5].replace(/\s*#.*$/, "").trim(),
    ]);
  }
  return entries;
}

export function findUnmarkedActionRefs(workflows) {
  const problems = [];
  for (const { file, source } of workflows) {
    source.split("\n").forEach((line, index) => {
      const ref = /^\s*(?:-\s+)?uses:\s*(\S+)/.exec(line);
      if (!ref) return;
      const uses = ref[1].replace(/^["']|["']$/g, "");
      if (uses.startsWith(".")) return;
      const marker = /#\s*ratchet:(\S+)/.exec(line);
      if (marker && marker[1] === "exclude") return;
      const report = (reason) =>
        problems.push({ file, line: index + 1, uses, reason });
      const refAt = uses.lastIndexOf("@");
      if (!/^[0-9a-f]{40}$/.test(uses.slice(refAt + 1))) {
        return report("not pinned to a commit SHA");
      }
      if (!marker) return report("no ratchet marker");
      const at = marker[1].lastIndexOf("@");
      if (at <= 0 || at === marker[1].length - 1) {
        return report("ratchet marker has no version");
      }
      if (marker[1].slice(0, at) !== uses.slice(0, refAt)) {
        report(`ratchet marker names ${marker[1].slice(0, at)}`);
      }
    });
  }
  return problems;
}

export function findInconsistentNodePins(workflows) {
  const pins = [];
  for (const { file, source } of workflows) {
    source.split("\n").forEach((line, index) => {
      const pin =
        /^\s*runtime:\s*node@(\d+)/.exec(line) ??
        /^\s*node-version:\s*["']?(\d+)(?:\.|["'\s]|$)/.exec(line);
      if (pin) pins.push({ file, line: index + 1, major: Number(pin[1]) });
    });
  }
  const majors = [...new Set(pins.map(({ major }) => major))];
  if (majors.length < 2) return [];
  const count = (major) => pins.filter((pin) => pin.major === major).length;
  const [dominant] = majors.sort((a, b) => count(b) - count(a) || b - a);
  return pins
    .filter(({ major }) => major !== dominant)
    .map((pin) => ({ ...pin, dominant }));
}

export function findDriftedAllowBuilds(allowBuilds, lockedIds) {
  const problems = [];
  const scoped = new Map();
  for (const [key, value] of allowBuilds) {
    const at = key.lastIndexOf("@");
    if (at <= 0) continue;
    const name = key.slice(0, at);
    if (!parseVersion(key.slice(at + 1))) continue;
    scoped.set(name, [...(scoped.get(name) ?? []), key]);
    if (!lockedIds.has(key)) {
      problems.push({ entry: key, value, reason: "is not installed" });
    }
  }
  for (const [name, keys] of scoped) {
    for (const id of lockedIds) {
      if (id.slice(0, id.lastIndexOf("@")) !== name) continue;
      if (keys.includes(id)) continue;
      problems.push({
        entry: id,
        value: null,
        reason: "has no allowBuilds entry",
      });
    }
  }
  return problems;
}

export function findStaleCoursePins(courses, floors, published) {
  const problems = [];
  for (const { file, pkg } of courses) {
    for (const field of VERSION_FIELDS) {
      for (const [name, pin] of Object.entries(pkg[field] ?? {})) {
        if (published.has(name)) continue;
        const floor = floors.get(name);
        const pinned = typeof pin === "string" ? parseVersion(pin) : null;
        if (!floor || !pinned) continue;
        if (compareVersions(pinned, floor) < 0) {
          problems.push({ file, name, pin, floor: floor.join(".") });
        }
      }
    }
  }
  return problems;
}

function readWorkflows(root) {
  return globSync(".github/workflows/*.{yaml,yml}", { cwd: root })
    .map(posixPath)
    .sort()
    .map((file) => ({
      file,
      source: readFileSync(path.join(root, file), "utf8"),
    }));
}

export function prevailingFloor(counts) {
  let winner = null;
  for (const [id, count] of counts) {
    const floor = parseVersion(id);
    if (
      !winner ||
      count > winner.count ||
      (count === winner.count && compareVersions(floor, winner.floor) > 0)
    ) {
      winner = { floor, count };
    }
  }
  return winner?.floor ?? null;
}

function readWorkspaceVersions(root) {
  const floors = new Map();
  const declared = new Map();
  const published = new Set();
  const manifests = ["package.json"];
  for (const glob of parseWorkspaceGlobs(
    readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"),
  )) {
    manifests.push(...globSync(`${glob}/package.json`, { cwd: root }));
  }
  for (const manifest of new Set(manifests.map(posixPath))) {
    const pkg = readJson(path.join(root, manifest));
    if (typeof pkg.name === "string" && pkg.private !== true) {
      published.add(pkg.name);
    }
    for (const field of VERSION_FIELDS) {
      for (const [name, range] of Object.entries(pkg[field] ?? {})) {
        const floor = lowestSatisfying(range);
        if (!floor) continue;
        const counts = declared.get(name) ?? new Map();
        const id = floor.join(".");
        counts.set(id, (counts.get(id) ?? 0) + 1);
        declared.set(name, counts);
      }
    }
  }
  for (const [name, counts] of declared) {
    floors.set(name, prevailingFloor(counts));
  }
  return { floors, published };
}

function readLockedIds(root) {
  const source = readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");
  const ids = new Set();
  for (const [key] of parseIndentedBlock(source, "packages")) {
    ids.add(key);
  }
  return ids;
}

export function runCheck(root = repoRoot) {
  const workflows = readWorkflows(root);
  const { floors, published } = readWorkspaceVersions(root);
  const courses = globSync(COURSE_PROJECT_GLOB, { cwd: root })
    .map(posixPath)
    .sort()
    .map((file) => ({ file, pkg: readJson(path.join(root, file)) }));
  return {
    workflowCount: workflows.length,
    courseCount: courses.length,
    unmarked: findUnmarkedActionRefs(workflows),
    nodePins: findInconsistentNodePins(workflows),
    allowBuilds: findDriftedAllowBuilds(
      parseIndentedBlock(
        readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8"),
        "allowBuilds",
      ),
      readLockedIds(root),
    ),
    coursePins: findStaleCoursePins(courses, floors, published),
  };
}

function main() {
  const result = runCheck(process.env.UNMANAGED_PIN_CHECK_ROOT);
  let failed = false;

  if (result.unmarked.length > 0) {
    failed = true;
    console.error(
      "Workflow `uses:` entries that are not SHA-pinned with a usable ratchet marker:\n",
    );
    for (const { file, line, uses, reason } of result.unmarked) {
      console.error(`  ${file}:${line}: ${uses} — ${reason}`);
    }
    console.error(
      "\nEvery action is pinned to a commit SHA, and `ratchet update` reads the trailing",
    );
    console.error(
      "`# ratchet:<owner>/<repo>@<version>` comment to learn which action that SHA came from. An entry",
    );
    console.error(
      "that reverts to a tag drops the pin, and one that loses its marker keeps working and stops being",
    );
    console.error(
      "updated. Restore the SHA and the marker, or annotate a deliberately unmanaged entry with",
    );
    console.error("`# ratchet:exclude`.\n");
  }

  if (result.nodePins.length > 0) {
    failed = true;
    console.error("Workflow Node.js pins disagree:\n");
    for (const { file, line, major, dominant } of result.nodePins) {
      console.error(`  ${file}:${line}: node@${major}, not node@${dominant}`);
    }
    console.error(
      "\nNothing resolves these against each other, so a partial bump splits CI across two Node.js",
    );
    console.error("majors without failing anything.\n");
  }

  if (result.allowBuilds.length > 0) {
    failed = true;
    console.error("`allowBuilds` no longer matches the lockfile:\n");
    for (const { entry, reason } of result.allowBuilds) {
      console.error(`  ${entry} ${reason}`);
    }
    console.error(
      "\nA version-scoped `allowBuilds` entry stops applying the moment the package resolves to a",
    );
    console.error(
      "different version, and `strictDepBuilds: true` turns the lost allowance into a failed install",
    );
    console.error(
      "rather than a warning. Move the entry to the installed version, or drop the version scope.\n",
    );
  }

  if (result.coursePins.length > 0) {
    failed = true;
    console.error("Learn course projects are behind the workspace:\n");
    for (const { file, name, pin, floor } of result.coursePins) {
      console.error(`  ${file}: "${name}" is ${pin}, workspace is on ${floor}`);
    }
    console.error(
      "\nThese projects are the skeleton Learn Mode hands a learner. They pin exact versions and are",
    );
    console.error(
      "not workspace members, so taze skips them and they drift by default rather than by decision.",
    );
    console.error(
      "Raise the pins to the workspace versions. Packages this repository publishes are exempt: they",
    );
    console.error(
      "move on every release, which the course projects do not participate in.\n",
    );
  }

  if (failed) process.exit(1);

  const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;
  console.log(
    `Pins outside the update pipeline are current. (${plural(result.workflowCount, "workflow")}, ` +
      `${plural(result.courseCount, "course project")} scanned)`,
  );
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) main();
