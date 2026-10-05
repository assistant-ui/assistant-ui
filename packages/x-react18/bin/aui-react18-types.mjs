#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { onlyInReact18, splitDiagnostics } from "../src/declaration-errors.mjs";
import {
  configProblems,
  declarationState,
  readsDist,
  react19Baseline,
  resolvedConfig,
  runTsc,
} from "../src/project.mjs";

const cwd = process.cwd();
const projects = process.argv.slice(2);
if (projects.length === 0) projects.push("tsconfig.peer-react18.json");

const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
function build(reason) {
  if (!pkg.scripts?.build) return;
  console.log(`dist is ${reason}, so building first.`);
  const result = spawnSync("pnpm", ["run", "build"], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Some tsc versions fail to resolve a project whose include matches no files, so a missing dist is built before resolving.
if (declarationState(cwd) === "missing") build("missing");
const configs = projects.map((project) => ({
  project,
  config: resolvedConfig(project, cwd),
}));
const checksDist = configs.some(({ project, config }) =>
  readsDist(config, join(cwd, dirname(project)), cwd),
);
if (checksDist && declarationState(cwd) === "stale") build("older than src");

let failed = false;
for (const { project, config } of configs) {
  const problems = configProblems(config);
  if (problems.length > 0) {
    failed = true;
    console.error(
      `${project}: ${problems.join(", and ")}. List @assistant-ui/x-react18/tsconfig.json last in "extends", and don't override skipLibCheck or the react and react-dom paths.\n`,
    );
    continue;
  }
  const react18 = runTsc(project, cwd);
  const { own, upstream } = splitDiagnostics(react18.output);
  if (own.length > 0) {
    failed = true;
    console.error(
      `${project}: the package's own files don't type-check against React 18:\n${own.join("\n")}\n`,
    );
  }
  if (upstream.length > 0) {
    const baselineFile = join(
      cwd,
      dirname(project),
      `.${basename(project)}.react19-baseline-${process.pid}-${randomUUID()}.json`,
    );
    writeFileSync(baselineFile, JSON.stringify(react19Baseline(config)), {
      flag: "wx",
    });
    let react19;
    try {
      react19 = splitDiagnostics(runTsc(baselineFile, cwd).output).upstream;
    } finally {
      rmSync(baselineFile, { force: true });
    }
    const introduced = onlyInReact18(upstream, react19);
    if (introduced.length > 0) {
      failed = true;
      console.error(
        `${project}: React 18's types introduce errors in upstream declarations (node_modules or workspace dependencies) that React 19's don't:\n${introduced.join("\n")}\n`,
      );
    }
    const shared = upstream.length - introduced.length;
    if (shared > 0) {
      console.log(
        `${project}: ${shared} error(s) in upstream declarations (node_modules or workspace dependencies) fail the same way against React 19, so they aren't React 18's.`,
      );
    }
  }
  if (react18.status !== 0 && own.length === 0 && upstream.length === 0) {
    failed = true;
    console.error(`${project}: tsc failed:\n${react18.output}`);
  }
}
if (failed) process.exit(1);
console.log("The published declarations type-check against React 18.");
