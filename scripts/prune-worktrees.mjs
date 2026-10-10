import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { isExecutedAsMain } from "./lib/main.mjs";
import { hasOption } from "./lib/script-options.mjs";

const exec = promisify(execFile);
const BASE = "origin/main";

async function run(command, args, cwd) {
  const { stdout } = await exec(command, args, {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout.trim();
}

async function succeeds(command, args, cwd) {
  try {
    await run(command, args, cwd);
    return true;
  } catch {
    return false;
  }
}

export function parseWorktrees(porcelain) {
  return porcelain
    .split(/\n{2,}/)
    .filter((block) => block.trim())
    .map((block) => {
      const fields = new Map(
        block.split("\n").map((line) => {
          const space = line.indexOf(" ");
          return space === -1
            ? [line, ""]
            : [line.slice(0, space), line.slice(space + 1)];
        }),
      );
      return {
        path: fields.get("worktree"),
        head: fields.get("HEAD"),
        branch: fields.get("branch")?.replace(/^refs\/heads\//, ""),
        bare: fields.has("bare"),
        locked: fields.has("locked"),
        prunable: fields.has("prunable"),
      };
    });
}

const isWithin = (child, parent) =>
  child === parent || child.startsWith(parent + path.sep);

async function findPullRequest(primary, branch) {
  const prs = JSON.parse(
    await run(
      "gh",
      [
        "pr",
        "list",
        "--state",
        "all",
        "--head",
        branch,
        "--json",
        "state,mergedAt,number,headRefOid",
      ],
      primary,
    ),
  );
  return (
    prs.find((pr) => pr.state === "OPEN") ??
    prs.toSorted((a, b) => b.number - a.number)[0]
  );
}

async function checkMergedIntoBase(cwd, head) {
  if (!(await succeeds("git", ["rev-parse", "--verify", BASE], cwd))) {
    return { reason: `no ${BASE}` };
  }
  const mergeBase = await run("git", ["merge-base", head, BASE], cwd);
  if (mergeBase === head) return { reason: `no commits beyond ${BASE}` };
  const squash = await run(
    "git",
    ["commit-tree", `${head}^{tree}`, "-p", mergeBase, "-m", "squash"],
    cwd,
  );
  const cherry = await run("git", ["cherry", BASE, squash, mergeBase], cwd);
  return cherry.startsWith("-")
    ? { merged: `merged into ${BASE}` }
    : { reason: `not merged into ${BASE}` };
}

async function inspect(primary, worktree, useGitHub) {
  if (worktree.prunable) return { remove: true, reason: "directory missing" };
  if (!worktree.branch) return { remove: false, reasons: ["detached HEAD"] };
  if (worktree.branch === BASE.replace(/^origin\//, "")) {
    return { remove: false, reasons: [`on ${worktree.branch}`] };
  }

  const { head } = worktree;
  const reasons = [];
  let finished;
  let contained = false;
  if (useGitHub) {
    const pr = await findPullRequest(primary, worktree.branch);
    if (!pr) reasons.push("no PR");
    else if (pr.state === "OPEN") reasons.push(`open PR #${pr.number}`);
    else finished = `PR #${pr.number} ${pr.state.toLowerCase()}`;
    contained =
      pr !== undefined &&
      (pr.headRefOid === head ||
        (await succeeds(
          "git",
          ["merge-base", "--is-ancestor", head, pr.headRefOid],
          primary,
        )));
  } else {
    const { merged, reason } = await checkMergedIntoBase(primary, head);
    if (reason) reasons.push(reason);
    finished = merged;
    contained = merged !== undefined;
  }

  if (await run("git", ["status", "--porcelain"], worktree.path)) {
    reasons.push("dirty");
  }
  if (
    !contained &&
    (await run(
      "git",
      ["rev-list", "--count", head, "--not", "--remotes"],
      primary,
    )) !== "0"
  ) {
    reasons.push("unpushed");
  }
  return reasons.length
    ? { remove: false, reasons }
    : { remove: true, reason: finished };
}

export async function pruneWorktrees({
  cwd = process.cwd(),
  apply = false,
  local = false,
  log = console.log,
} = {}) {
  const worktrees = parseWorktrees(
    await run("git", ["worktree", "list", "--porcelain"], cwd),
  );
  const [primary, ...others] = worktrees;
  const root = primary.path;
  const locked = others.filter((worktree) => worktree.locked);

  const useGitHub =
    !local &&
    (await succeeds(
      "gh",
      ["pr", "list", "--limit", "1", "--json", "number"],
      root,
    ));
  log(
    useGitHub
      ? "Checking each worktree's pull request on GitHub."
      : `${local ? "--local" : "gh is unavailable"}: checking whether each branch is squash-merged into ${BASE} as last fetched.`,
  );

  const plans = await Promise.all(
    others
      .filter((worktree) => !worktree.bare)
      .map(async (worktree) => ({
        worktree,
        label: `${path.relative(root, worktree.path)} [${worktree.branch ?? "detached"}]`,
        ...(locked.some((lockedTree) =>
          isWithin(worktree.path, lockedTree.path),
        )
          ? { remove: false, reasons: ["locked"] }
          : await inspect(root, worktree, useGitHub)),
      })),
  );

  const removable = plans.filter((plan) => plan.remove);
  const kept = plans.filter((plan) => !plan.remove);
  log(`\n${apply ? "Removing" : "Would remove"} ${removable.length}:`);
  for (const plan of removable) log(`  ${plan.label}: ${plan.reason}`);
  log(`\nKeeping ${kept.length}:`);
  for (const plan of kept) log(`  ${plan.label}: ${plan.reasons.join(", ")}`);

  const failed = [];
  if (apply) {
    const removed = [];
    for (const plan of removable) {
      try {
        if (!plan.worktree.prunable) {
          await run("git", ["worktree", "remove", plan.worktree.path], root);
        }
        removed.push(plan);
      } catch (error) {
        failed.push(plan.label);
        log(
          `  failed to remove ${plan.label}: ${error.stderr?.trim() || error.message}`,
        );
      }
    }
    await run("git", ["worktree", "prune"], root);
    for (const { worktree, label } of removed) {
      if (!worktree.branch) continue;
      try {
        await run("git", ["branch", "-D", worktree.branch], root);
      } catch (error) {
        failed.push(label);
        log(
          `  failed to delete ${worktree.branch}: ${error.stderr?.trim() || error.message}`,
        );
      }
    }
  } else if (removable.length) {
    log(`\nDry run: pass --yes to remove ${removable.length}.`);
  }
  return { removable, kept, failed };
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  const args = process.argv.slice(2);
  const { failed } = await pruneWorktrees({
    apply: hasOption(args, "--yes"),
    local: hasOption(args, "--local"),
  });
  if (failed.length) process.exitCode = 1;
}
