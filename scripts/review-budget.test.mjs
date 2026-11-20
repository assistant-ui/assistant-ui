import assert from "node:assert/strict";
import test from "node:test";
import { countReviews } from "./review-budget.mjs";

const repo = "assistant-ui/assistant-ui";
const opts = {
  repo,
  event: "pull_request_target",
  runId: 999,
  job: "claude-fork-review",
  author: "alice",
};

let id = 0;
const run = (author, conclusion = "success", fork = true) => ({
  run: {
    id: ++id,
    actor: { login: "someone" },
    head_repository: { full_name: fork ? `${author}/x` : repo },
  },
  jobs: [
    { name: `claude-fork-review-budget (${author})`, conclusion: "success" },
    { name: "claude-fork-review", conclusion },
  ],
});

// Serves the runs list (paged by 100) and each run's jobs.
function mock(entries, totalCount = entries.length) {
  const calls = [];
  return {
    calls,
    rest: async (_method, path) => {
      calls.push(path);
      const page = /[?&]page=(\d+)/.exec(path)?.[1];
      if (page) {
        const runs = entries
          .slice((page - 1) * 100, page * 100)
          .map((e) => e.run);
        return { data: { total_count: totalCount, workflow_runs: runs } };
      }
      const runId = Number(/runs\/(\d+)\/jobs/.exec(path)[1]);
      return { data: { jobs: entries.find((e) => e.run.id === runId).jobs } };
    },
  };
}

test("counts reviews per author and repo-wide", async () => {
  const github = mock([
    run("alice"),
    run("ALICE"),
    run("bob"),
    run("alice", null),
  ]);
  assert.deepEqual(await countReviews(github, opts), { author: 3, repo: 4 });
});

test("ignores skipped reviews, same-repo runs and the current run", async () => {
  const current = run("alice");
  current.run.id = 999;
  const github = mock([
    run("alice", "skipped"),
    run("alice", "success", false),
    current,
    run("alice"),
  ]);
  assert.deepEqual(await countReviews(github, opts), { author: 1, repo: 1 });
  assert.ok(!github.calls.some((c) => c.includes("/runs/999/")));
});

test("counts cancelled reviews", async () => {
  const github = mock([run("alice", "cancelled")]);
  assert.deepEqual(await countReviews(github, opts), { author: 1, repo: 1 });
});

test("falls back to the run actor when the budget job has no author", async () => {
  const old = run("alice");
  old.jobs.shift();
  old.run.actor.login = "alice";
  assert.deepEqual(await countReviews(mock([old]), opts), {
    author: 1,
    repo: 1,
  });
});

test("pages past 100 runs and filters by the last 24h", async () => {
  const github = mock([
    ...Array.from({ length: 100 }, () => run("bob", "skipped")),
    run("alice"),
  ]);
  assert.deepEqual(
    await countReviews(github, opts, Date.parse("2026-11-19T12:00:00Z")),
    { author: 1, repo: 1 },
  );
  assert.match(
    github.calls[0],
    /event=pull_request_target&created=%3E%3D2026-11-18T12%3A00%3A00\.000Z/,
  );
  assert.ok(github.calls.some((c) => c.includes("page=2")));
});

test("fails closed past the 1000-run API ceiling", async () => {
  assert.deepEqual(await countReviews(mock([], 1001), opts), {
    author: Infinity,
    repo: Infinity,
  });
});
