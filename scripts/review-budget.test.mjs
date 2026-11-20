import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createGitHubClient } from "./lib/review-github-client.mjs";
import {
  commentMarker,
  countRecentReviews,
  limitComment,
  readConfig,
  run,
} from "./review-budget.mjs";

const repository = "assistant-ui/assistant-ui";
const now = new Date("2026-11-19T12:00:00Z");
const hoursAgo = (hours) =>
  new Date(now.getTime() - hours * 3600 * 1000).toISOString();

const baseEnv = {
  GITHUB_REPOSITORY: repository,
  GITHUB_EVENT_NAME: "pull_request_target",
  GITHUB_RUN_ID: "999",
  PR_NUMBER: "42",
  PR_AUTHOR: "contributor",
  PR_LABELS: "[]",
  REVIEW_BUDGET_WORKFLOW: "claude-code-review.yml",
  REVIEW_BUDGET_JOB: "claude-fork-review",
  REVIEW_BUDGET_LABEL: "claude-review",
  REVIEW_BUDGET_PER_AUTHOR: "3",
  REVIEW_BUDGET_REPO: "30",
  REVIEW_BUDGET_WINDOW_HOURS: "24",
};

let nextId = 1;
const forkRun = ({
  author = "contributor",
  conclusion = "success",
  status = "completed",
  created = hoursAgo(1),
  job = "claude-fork-review",
  id = nextId++,
} = {}) => ({
  run: {
    id,
    created_at: created,
    actor: { login: author },
    triggering_actor: { login: author },
    head_repository: {
      full_name: `${author}/assistant-ui`,
      owner: { login: author },
    },
  },
  jobs: [
    { name: "claude-review", status: "completed", conclusion: "skipped" },
    {
      name: "claude-fork-review-budget",
      status: "completed",
      conclusion: "success",
    },
    { name: job, status, conclusion },
  ],
});

const sameRepoRun = () => ({
  run: {
    id: nextId++,
    created_at: hoursAgo(1),
    actor: { login: "maintainer" },
    head_repository: {
      full_name: repository,
      owner: { login: "assistant-ui" },
    },
  },
  jobs: null,
});

// Serves the GitHub REST endpoints the script reads through the real client,
// so request paths, pagination and the POST body are all exercised.
function mockGitHub({ runs = [], comments = [], totalCount } = {}) {
  const requests = [];
  const posted = [];
  const json = (body, headers = {}) =>
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json", ...headers },
    });
  const fetch = async (url, options) => {
    const { pathname, searchParams } = new URL(url);
    requests.push(`${options.method} ${pathname}${new URL(url).search}`);
    const runsPath = `/repos/${repository}/actions/workflows/claude-code-review.yml/runs`;
    if (pathname === runsPath) {
      assert.equal(searchParams.get("event"), "pull_request_target");
      assert.match(searchParams.get("created"), /^>=\d{4}-/);
      const page = Number(searchParams.get("page"));
      const slice = runs.slice((page - 1) * 100, page * 100);
      return json({
        total_count: totalCount ?? runs.length,
        workflow_runs: slice.map((r) => r.run),
      });
    }
    const jobsMatch =
      /^\/repos\/[^/]+\/[^/]+\/actions\/runs\/(\d+)\/jobs$/.exec(pathname);
    if (jobsMatch) {
      const entry = runs.find((r) => r.run.id === Number(jobsMatch[1]));
      assert.ok(entry?.jobs, `unexpected jobs request for run ${jobsMatch[1]}`);
      return json({ total_count: entry.jobs.length, jobs: entry.jobs });
    }
    if (pathname === `/repos/${repository}/issues/42/comments`) {
      if (options.method === "POST") {
        posted.push(JSON.parse(options.body).body);
        return json({ id: 1 });
      }
      return json(comments);
    }
    throw new Error(`unexpected request ${options.method} ${url}`);
  };
  return {
    github: createGitHubClient({ token: "test", fetch, wait: async () => {} }),
    requests,
    posted,
  };
}

async function runWith(env, mock) {
  const dir = mkdtempSync(path.join(tmpdir(), "review-budget-"));
  const output = path.join(dir, "output");
  try {
    const decision = await run({
      env: { ...baseEnv, ...env, GITHUB_OUTPUT: output },
      github: mock.github,
      now,
      log: () => {},
    });
    return { decision, output: readFileSync(output, "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("reviews when the author and repository are under their limits", async () => {
  const mock = mockGitHub({
    runs: [forkRun(), forkRun(), forkRun({ author: "someone-else" })],
  });
  const { decision, output } = await runWith({}, mock);
  assert.equal(decision.review, true);
  assert.deepEqual(
    { author: decision.counts.author, repo: decision.counts.repo },
    { author: 2, repo: 3 },
  );
  assert.equal(output, "review=true\n");
  assert.deepEqual(mock.posted, []);
});

test("skips the third-plus review for one author and comments once", async () => {
  const mock = mockGitHub({ runs: [forkRun(), forkRun(), forkRun()] });
  const { decision, output } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.match(decision.reason, /contributor already had 3 reviews/);
  assert.equal(output, "review=false\n");
  assert.deepEqual(mock.posted, [limitComment("claude-review")]);
  assert.match(
    mock.posted[0],
    /Automatic review limit reached for today\. A maintainer can request a review by adding the `claude-review` label\./,
  );
});

test("does not post the limit comment twice", async () => {
  const mock = mockGitHub({
    runs: [forkRun(), forkRun(), forkRun()],
    comments: [
      {
        user: { login: "github-actions[bot]" },
        body: limitComment("claude-review"),
      },
    ],
  });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.deepEqual(mock.posted, []);
});

test("ignores a marker comment written by someone other than the bot", async () => {
  const mock = mockGitHub({
    runs: [forkRun(), forkRun(), forkRun()],
    comments: [{ user: { login: "contributor" }, body: commentMarker }],
  });
  await runWith({}, mock);
  assert.equal(mock.posted.length, 1);
});

test("skips once the repository-wide limit is reached", async () => {
  const runs = Array.from({ length: 30 }, (_, i) =>
    forkRun({ author: `user-${i}` }),
  );
  const mock = mockGitHub({ runs });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.match(
    decision.reason,
    /30 fork reviews ran in the last 24h \(limit 30\)/,
  );
  assert.equal(mock.posted.length, 1);
});

test("the maintainer label bypasses both limits without reading run history", async () => {
  const mock = mockGitHub({ runs: [forkRun(), forkRun(), forkRun()] });
  const { decision, output } = await runWith(
    { PR_LABELS: JSON.stringify(["tier/1", "claude-review"]) },
    mock,
  );
  assert.equal(decision.review, true);
  assert.equal(output, "review=true\n");
  assert.deepEqual(mock.requests, []);
  assert.deepEqual(mock.posted, []);
});

test("does not count skipped reviews, same-repo runs, old runs or this run", async () => {
  const mock = mockGitHub({
    runs: [
      forkRun({ conclusion: "skipped" }),
      forkRun({ conclusion: "skipped" }),
      forkRun({ created: hoursAgo(25) }),
      forkRun({ id: 999 }),
      forkRun({ job: "something-else" }),
      sameRepoRun(),
      forkRun(),
    ],
  });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, true);
  assert.equal(decision.counts.author, 1);
  assert.equal(decision.counts.repo, 1);
  assert.ok(!mock.requests.some((r) => r.includes("/runs/999/jobs")));
});

test("counts queued, running and cancelled reviews", async () => {
  const mock = mockGitHub({
    runs: [
      forkRun({ status: "queued", conclusion: null }),
      forkRun({ status: "in_progress", conclusion: null }),
      forkRun({ conclusion: "cancelled" }),
    ],
  });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.equal(decision.counts.author, 3);
});

test("matches the author case-insensitively and through the fork owner", async () => {
  const renamed = forkRun({ author: "Contributor" });
  const viaFork = forkRun({ author: "maintainer" });
  viaFork.run.head_repository.owner.login = "contributor";
  const mock = mockGitHub({ runs: [renamed, viaFork, forkRun()] });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.equal(decision.counts.author, 3);
});

test("pages through more than 100 runs", async () => {
  const runs = [
    ...Array.from({ length: 100 }, () => forkRun({ conclusion: "skipped" })),
    forkRun(),
    forkRun(),
    forkRun(),
  ];
  const mock = mockGitHub({ runs });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.ok(mock.requests.some((r) => r.includes("page=2")));
});

test("fails closed when the scan cap is hit", async () => {
  const runs = Array.from({ length: 5 }, () =>
    forkRun({ conclusion: "skipped" }),
  );
  const mock = mockGitHub({ runs });
  const { decision } = await runWith({ REVIEW_BUDGET_MAX_RUNS: "4" }, mock);
  assert.equal(decision.review, false);
  assert.match(decision.reason, /over 4 fork runs/);
});

test("fails closed past the Actions search result ceiling", async () => {
  const mock = mockGitHub({ runs: [forkRun()], totalCount: 1001 });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.match(decision.reason, /too many runs/);
  assert.ok(!mock.requests.some((r) => r.includes("/jobs")));
});

test("attributes reviews to the author named by the budget job", async () => {
  // A collaborator pushing to someone else's PR from an org fork: no run
  // actor or fork owner is the PR author.
  const pushed = () => {
    const entry = forkRun({ author: "collaborator" });
    entry.run.head_repository.owner.login = "some-org";
    entry.jobs[1].name = "claude-fork-review-budget (contributor)";
    return entry;
  };
  const other = forkRun();
  other.jobs[1].name = "claude-fork-review-budget (someone-else)";
  const mock = mockGitHub({ runs: [pushed(), pushed(), other, pushed()] });
  const { decision } = await runWith({}, mock);
  assert.equal(decision.review, false);
  assert.equal(decision.counts.author, 3);
  assert.equal(decision.counts.repo, 4);
});

test("an API failure throws instead of reviewing", async () => {
  const github = createGitHubClient({
    token: "test",
    wait: async () => {},
    fetch: async () => new Response("Forbidden", { status: 403 }),
  });
  await assert.rejects(
    countRecentReviews(github, readConfig(baseEnv), now),
    /GitHub request failed \(403/,
  );
});

test("readConfig rejects invalid limits and labels", () => {
  assert.throws(
    () => readConfig({ ...baseEnv, REVIEW_BUDGET_PER_AUTHOR: "0" }),
    /REVIEW_BUDGET_PER_AUTHOR must be a positive integer/,
  );
  assert.throws(
    () => readConfig({ ...baseEnv, REVIEW_BUDGET_REPO: "lots" }),
    /REVIEW_BUDGET_REPO must be a positive integer/,
  );
  assert.throws(
    () => readConfig({ ...baseEnv, PR_LABELS: '"claude-review"' }),
    /PR_LABELS must be an array/,
  );
  assert.throws(
    () => readConfig({ ...baseEnv, PR_AUTHOR: "" }),
    /PR_AUTHOR is required/,
  );
});
