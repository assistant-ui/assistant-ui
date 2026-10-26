import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  checkSetupAgentReleased,
  lookupNpmVersion,
  newestReleasedCommit,
  newestReleasedSince,
  pendingSetupAgentChangesets,
  retryDelays,
} from "./checkout-worker-release.mjs";

function releaseTree(changesets = {}, version = "1.2.3") {
  const root = mkdtempSync(path.join(tmpdir(), "aui-checkout-worker-"));
  mkdirSync(path.join(root, ".changeset", "pre"), { recursive: true });
  mkdirSync(path.join(root, "packages", "setup-agent"), { recursive: true });
  writeFileSync(path.join(root, ".changeset", "README.md"), "# Changesets\n");
  for (const [file, source] of Object.entries(changesets)) {
    writeFileSync(path.join(root, ".changeset", file), source);
  }
  writeFileSync(
    path.join(root, "packages", "setup-agent", "package.json"),
    JSON.stringify({ name: "setup-agent", version }),
  );
  return root;
}

const registry = (statuses) => {
  const calls = [];
  return {
    calls,
    fetch: async (url) => {
      calls.push(url);
      const status = statuses[Math.min(calls.length, statuses.length) - 1];
      if (status instanceof Error) throw status;
      return { status };
    },
  };
};

const noSleep = async () => {};

test("finds pending changesets that release setup-agent, quoted or not", () => {
  const root = releaseTree({
    "cli.md": '---\n"setup-agent": patch\n---\n\nFix the CLI.\n',
    "pre/early.md": "---\nsetup-agent: minor\n---\n",
    "other.md":
      "---\n'@assistant-ui/react': patch\n---\n\nsetup-agent: not a key\n",
  });
  assert.deepEqual(pendingSetupAgentChangesets(root).toSorted(), [
    "cli.md",
    "pre/early.md",
  ]);
});

test("ignores packages whose names only contain setup-agent", () => {
  const root = releaseTree({
    "other.md": "---\n'@assistant-ui/setup-agent-docs': patch\n---\n",
  });
  assert.deepEqual(pendingSetupAgentChangesets(root), []);
});

test("spreads the retry window over a capped exponential backoff", () => {
  assert.deepEqual(retryDelays(0), []);
  assert.deepEqual(retryDelays(30_000), [2_000, 4_000, 8_000, 10_000, 6_000]);
  const release = retryDelays(15 * 60_000);
  assert.equal(
    release.reduce((sum, delay) => sum + delay, 0),
    15 * 60_000,
  );
  assert.ok(release.every((delay) => delay <= 10_000));
});

test("retries a registry error within the window", async () => {
  const npm = registry([new Error("fetch failed"), 503, 200]);
  const sleeps = [];
  const result = await lookupNpmVersion("1.2.3", {
    windowMs: 30_000,
    fetch: npm.fetch,
    sleep: async (ms) => sleeps.push(ms),
  });
  assert.equal(result, "HTTP 200");
  assert.deepEqual(sleeps, [2_000, 4_000]);
  assert.deepEqual(npm.calls, [
    "https://registry.npmjs.org/setup-agent/1.2.3",
    "https://registry.npmjs.org/setup-agent/1.2.3",
    "https://registry.npmjs.org/setup-agent/1.2.3",
  ]);
});

test("gives up with the last result once the window is spent", async () => {
  const npm = registry([404]);
  const result = await lookupNpmVersion("1.2.3", {
    windowMs: 30_000,
    fetch: npm.fetch,
    sleep: noSleep,
  });
  assert.equal(result, "HTTP 404");
  assert.equal(npm.calls.length, 6);
});

test("holds back a tree with a pending setup-agent changeset without asking npm", async () => {
  const npm = registry([200]);
  const result = await checkSetupAgentReleased(
    releaseTree({ "cli.md": "---\nsetup-agent: patch\n---\n" }),
    { windowMs: 30_000, fetch: npm.fetch, sleep: noSleep },
  );
  assert.equal(result.released, false);
  assert.match(result.reason, /pending setup-agent changesets \(cli\.md\)/);
  assert.equal(npm.calls.length, 0);
});

test("releases a tree whose setup-agent version is on npm", async () => {
  const npm = registry([200]);
  assert.deepEqual(
    await checkSetupAgentReleased(releaseTree({}, "0.0.9"), {
      windowMs: 0,
      fetch: npm.fetch,
      sleep: noSleep,
    }),
    { released: true, reason: "setup-agent@0.0.9 is on npm" },
  );
});

test("holds back a tree whose setup-agent version is not on npm", async () => {
  const npm = registry([404]);
  assert.deepEqual(
    await checkSetupAgentReleased(releaseTree({}, "0.0.9"), {
      windowMs: 0,
      fetch: npm.fetch,
      sleep: noSleep,
    }),
    {
      released: false,
      reason: "setup-agent@0.0.9 is not on npm (HTTP 404)",
    },
  );
});

test("walks past pending HEAD and selects the newest released commit", async () => {
  const trees = {
    H: releaseTree({ "cli.md": "---\nsetup-agent: patch\n---\n" }, "1.2.4"),
    W: releaseTree({}, "1.2.3"),
    A: releaseTree({}, "1.2.3"),
  };
  const npm = registry([200]);
  assert.deepEqual(
    await newestReleasedCommit(["H", "W", "A"], {
      materialize: (sha) => trees[sha],
      windowMs: 0,
      fetch: npm.fetch,
      sleep: noSleep,
    }),
    { sha: "W", reason: "setup-agent@1.2.3 is on npm" },
  );
  assert.equal(npm.calls.length, 1);
});

test("looks up each distinct version once across a walk and returns null when none is released", async () => {
  const trees = {
    H: releaseTree({}, "1.2.4"),
    W: releaseTree({}, "1.2.4"),
    B: releaseTree({}, "1.2.3"),
    A: releaseTree({}, "1.2.3"),
  };
  const npm = registry([404]);
  assert.equal(
    await newestReleasedCommit(["H", "W", "B", "A"], {
      materialize: (sha) => trees[sha],
      windowMs: 0,
      fetch: npm.fetch,
      sleep: noSleep,
    }),
    null,
  );
  assert.deepEqual(npm.calls, [
    "https://registry.npmjs.org/setup-agent/1.2.4",
    "https://registry.npmjs.org/setup-agent/1.2.3",
  ]);
});

test("newest-since writes the selected SHA, falls back, and rejects an absent boundary", async () => {
  const root = releaseTree({}, "1.2.3");
  const git = (...args) =>
    execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  git("init", "-q");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  const commit = (message) => {
    git("add", "--all");
    git("commit", "-qm", message);
    return git("rev-parse", "HEAD");
  };
  const a = commit("A");
  writeFileSync(path.join(root, "version.txt"), "W\n");
  const w = commit("W");
  writeFileSync(
    path.join(root, ".changeset", "cli.md"),
    "---\nsetup-agent: patch\n---\n",
  );
  commit("H");

  const output = path.join(root, "github-output");
  const npm = registry([200]);
  assert.deepEqual(
    await newestReleasedSince(a, {
      cwd: root,
      windowMs: 0,
      fetch: npm.fetch,
      sleep: noSleep,
      outputFile: output,
    }),
    { sha: w, reason: "setup-agent@1.2.3 is on npm" },
  );
  assert.match(
    readFileSync(output, "utf8"),
    new RegExp(`sha=${w}\\nreason=setup-agent@1\\.2\\.3 is on npm`),
  );
  assert.equal(npm.calls.length, 1);

  assert.deepEqual(
    await newestReleasedSince(w, {
      cwd: root,
      windowMs: 0,
      fetch: npm.fetch,
      sleep: noSleep,
      outputFile: output,
    }),
    {
      sha: w,
      reason: `No released commit since ${w}; deploying the planned commit`,
    },
  );
  assert.match(
    readFileSync(output, "utf8"),
    new RegExp(`sha=${w}\\nreason=No released commit since ${w}`),
  );
  assert.equal(npm.calls.length, 1);

  const stdout = execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("./checkout-worker-release.mjs", import.meta.url)),
      `--newest-since=${w}`,
      "--window-ms=0",
    ],
    {
      cwd: root,
      env: { ...process.env, GITHUB_OUTPUT: output },
      encoding: "utf8",
    },
  );
  assert.equal(
    stdout,
    `No released commit since ${w}; deploying the planned commit\n`,
  );

  await assert.rejects(
    newestReleasedSince("0".repeat(40), {
      cwd: root,
      windowMs: 0,
      fetch: npm.fetch,
    }),
    /not on HEAD's first-parent chain/,
  );
  await assert.rejects(
    newestReleasedSince("invalid", { cwd: root, windowMs: 0 }),
    /full 40-character commit SHA/,
  );
});
