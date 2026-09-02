import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { REF_PACKAGE_DIRS } from "./ref-packages.mjs";
import { git, pkgRoot, repoRoot } from "./suite.mjs";

export const ensureRefWorktree = (ref, { build = true } = {}) => {
  const root = repoRoot();
  const sha = git(["rev-parse", "--short", ref], root);
  if (sha === "unknown") {
    console.error(`cannot resolve ref: ${ref}`);
    process.exit(1);
  }
  const wt = join(tmpdir(), `aui-perf-ref-${sha}`);
  const marker = `${wt}.built`;
  if (!existsSync(wt)) {
    if (existsSync(marker)) rmSync(marker);
    execFileSync("git", ["worktree", "prune", "--expire", "now"], {
      cwd: root,
    });
    console.error(`creating ref worktree for ${ref} (${sha}) at ${wt}`);
    execFileSync("git", ["worktree", "add", "--detach", wt, sha], {
      cwd: root,
      stdio: ["ignore", 2, "inherit"],
    });
  }
  if (!build) return { wt, sha, marker };
  if (!existsSync(marker)) {
    console.error("installing and building ref packages (one-time per ref)...");
    execFileSync("pnpm", ["install"], {
      cwd: wt,
      stdio: ["ignore", 2, "inherit"],
      env: { ...process.env, CI: "true" },
    });
    const filters = Object.keys(REF_PACKAGE_DIRS).map(
      (name) => `--filter=${name}`,
    );
    execFileSync("pnpm", ["turbo", "run", "build", ...filters], {
      cwd: wt,
      stdio: ["ignore", 2, "inherit"],
    });
    writeFileSync(marker, sha);
  }
  pinReactToCurrentTree(wt);
  return { wt, sha, marker };
};

// Ref dists are externalized, so Node resolves their react imports from the
// ref worktree's node_modules and would mount a second React instance (hooks
// then crash with a null dispatcher). Repoint react and react-dom at the
// current tree's copies, both at each ref package's own node_modules and at
// the pnpm store entries that the ref's third-party dependencies (radix and
// friends) resolve through; symlinks resolve to the same realpath, so every
// consumer on both sides shares one module instance. This deliberately
// neutralizes react version differences between head and base: a cross-ref
// table spanning a react bump measures the packages, never react itself.
const pinReactToCurrentTree = (wt) => {
  const requireFromPkg = createRequire(join(pkgRoot, "package.json"));
  const storeDir = join(wt, "node_modules", ".pnpm");
  const storeEntries = existsSync(storeDir) ? readdirSync(storeDir) : [];
  for (const dep of ["react", "react-dom"]) {
    const target = dirname(requireFromPkg.resolve(`${dep}/package.json`));
    const links = Object.values(REF_PACKAGE_DIRS).map((dir) =>
      join(wt, dir, "node_modules", dep),
    );
    for (const entry of storeEntries) {
      if (entry.startsWith(`${dep}@`))
        links.push(join(storeDir, entry, "node_modules", dep));
    }
    for (const link of links) {
      mkdirSync(dirname(link), { recursive: true });
      rmSync(link, { recursive: true, force: true });
      symlinkSync(target, link, "dir");
    }
  }
};

// Content hash of a built package. Sourcemaps are skipped because they embed
// source paths that differ between worktrees without any runtime difference.
export const distFingerprint = (dir) => {
  if (!existsSync(dir)) return null;
  const hash = createHash("sha256");
  const walk = (current) => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (!entry.name.endsWith(".map")) {
        hash.update(relative(dir, path));
        hash.update("\0");
        hash.update(readFileSync(path));
        hash.update("\0");
      }
    }
  };
  walk(dir);
  return hash.digest("hex");
};

// Measured packages whose built output differs between the two trees. A
// bench that only exercises packages outside this list cannot have moved for
// a real reason, which is what turns it into a noise control.
export const changedPackages = (currentRoot, refRoot) =>
  Object.entries(REF_PACKAGE_DIRS)
    .filter(
      ([, dir]) =>
        distFingerprint(join(currentRoot, dir, "dist")) !==
        distFingerprint(join(refRoot, dir, "dist")),
    )
    .map(([name]) => name);
