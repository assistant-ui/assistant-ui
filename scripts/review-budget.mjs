// Decides whether an external PR gets an automatic Claude review, by counting
// the reviews the fork review job already ran in the last window. It reads
// only GitHub Actions run history, so it needs no storage beyond the API.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createGitHubClient } from "./lib/review-github-client.mjs";

export const commentMarker = "<!-- claude-review-budget -->";

export function limitComment(label) {
  return `${commentMarker}\nAutomatic review limit reached for today. A maintainer can request a review by adding the \`${label}\` label.`;
}

const positiveInt = (name, value) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${name} must be a positive integer, got "${value}"`);
  }
  return number;
};

export function readConfig(env) {
  const required = (name) => {
    const value = env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
  };
  let labels = [];
  if (env.PR_LABELS) {
    labels = JSON.parse(env.PR_LABELS);
    if (!Array.isArray(labels)) throw new Error("PR_LABELS must be an array");
  }
  return {
    repository: required("GITHUB_REPOSITORY"),
    event: required("GITHUB_EVENT_NAME"),
    currentRunId: Number(required("GITHUB_RUN_ID")),
    prNumber: positiveInt("PR_NUMBER", required("PR_NUMBER")),
    author: required("PR_AUTHOR"),
    labels,
    workflow: required("REVIEW_BUDGET_WORKFLOW"),
    job: required("REVIEW_BUDGET_JOB"),
    label: required("REVIEW_BUDGET_LABEL"),
    perAuthor: positiveInt(
      "REVIEW_BUDGET_PER_AUTHOR",
      required("REVIEW_BUDGET_PER_AUTHOR"),
    ),
    repoWide: positiveInt("REVIEW_BUDGET_REPO", required("REVIEW_BUDGET_REPO")),
    windowHours: positiveInt(
      "REVIEW_BUDGET_WINDOW_HOURS",
      required("REVIEW_BUDGET_WINDOW_HOURS"),
    ),
    maxRuns: positiveInt(
      "REVIEW_BUDGET_MAX_RUNS",
      env.REVIEW_BUDGET_MAX_RUNS ?? "500",
    ),
  };
}

// The Actions API caps a filtered run search at this many results; later pages
// come back empty, so a larger total cannot be counted.
const searchCeiling = 1000;

// The budget job's name carries the PR author, `<job>-budget (<login>)`, since
// fork runs have no pull_requests entry and the run's actor need not be the
// author. Runs from before that name existed fall back to the run's actors.
const runAuthors = (run, jobs, config) => {
  const prefix = `${config.job}-budget (`;
  const budget = jobs.find(
    ({ name }) => name?.startsWith(prefix) && name.endsWith(")"),
  );
  if (budget) return [budget.name.slice(prefix.length, -1)];
  return [
    run.actor?.login,
    run.triggering_actor?.login,
    run.head_repository?.owner?.login,
  ];
};

const ranAuthor = (logins, author) =>
  logins.some((login) => login?.toLowerCase() === author.toLowerCase());

// A review counts once its job was scheduled and not skipped: queued, running,
// or finished in any way, cancelled included, since a cancelled review may
// already have used the model.
const reviewRan = (job) =>
  !(job.status === "completed" && job.conclusion === "skipped");

export async function countRecentReviews(github, config, now = new Date()) {
  const since = new Date(now.getTime() - config.windowHours * 3600 * 1000);
  const created = encodeURIComponent(`>=${since.toISOString()}`);
  const counts = { author: 0, repo: 0, scanned: 0, truncated: false };

  for (let page = 1; ; page++) {
    const { data } = await github.rest(
      "GET",
      `repos/${config.repository}/actions/workflows/${encodeURIComponent(config.workflow)}/runs?event=${encodeURIComponent(config.event)}&created=${created}&per_page=100&page=${page}`,
    );
    if (data.total_count > searchCeiling) {
      counts.truncated = true;
      return counts;
    }
    const runs = data.workflow_runs ?? [];
    for (const run of runs) {
      if (run.id === config.currentRunId) continue;
      if (new Date(run.created_at) < since) continue;
      // pull_request_target runs for same-repository PRs never run the fork
      // job, so skip them without a jobs request.
      if (
        config.event === "pull_request_target" &&
        run.head_repository?.full_name === config.repository
      ) {
        continue;
      }
      if (counts.scanned >= config.maxRuns) {
        counts.truncated = true;
        return counts;
      }
      counts.scanned++;
      const { data: jobs } = await github.rest(
        "GET",
        `repos/${config.repository}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`,
      );
      const runJobs = jobs.jobs ?? [];
      const job = runJobs.find(({ name }) => name === config.job);
      if (!job || !reviewRan(job)) continue;
      counts.repo++;
      if (ranAuthor(runAuthors(run, runJobs, config), config.author)) {
        counts.author++;
      }
      if (counts.author >= config.perAuthor || counts.repo >= config.repoWide) {
        return counts;
      }
    }
    if (runs.length < 100) return counts;
  }
}

export async function decide(github, config, now = new Date()) {
  if (config.labels.includes(config.label)) {
    return { review: true, reason: `the \`${config.label}\` label is set` };
  }
  const counts = await countRecentReviews(github, config, now);
  const window = `${config.windowHours}h`;
  if (counts.truncated) {
    return {
      review: false,
      counts,
      reason: `too many runs in the last ${window} to count (over ${config.maxRuns} fork runs or ${searchCeiling} runs)`,
    };
  }
  if (counts.author >= config.perAuthor) {
    return {
      review: false,
      counts,
      reason: `${config.author} already had ${counts.author} reviews in the last ${window} (limit ${config.perAuthor})`,
    };
  }
  if (counts.repo >= config.repoWide) {
    return {
      review: false,
      counts,
      reason: `${counts.repo} fork reviews ran in the last ${window} (limit ${config.repoWide})`,
    };
  }
  return {
    review: true,
    counts,
    reason: `${counts.author}/${config.perAuthor} for ${config.author}, ${counts.repo}/${config.repoWide} repo-wide`,
  };
}

export async function ensureLimitComment(github, config) {
  const comments = await github.paginate(
    `repos/${config.repository}/issues/${config.prNumber}/comments?per_page=100`,
  );
  const exists = comments.some(
    (comment) =>
      comment.user?.login === "github-actions[bot]" &&
      comment.body?.includes(commentMarker),
  );
  if (exists) return false;
  await github.rest(
    "POST",
    `repos/${config.repository}/issues/${config.prNumber}/comments`,
    { body: limitComment(config.label) },
  );
  return true;
}

export async function run({
  env = process.env,
  github = createGitHubClient({ token: env.GITHUB_TOKEN }),
  now = new Date(),
  log = console.log,
} = {}) {
  const config = readConfig(env);
  const decision = await decide(github, config, now);
  log(
    `${decision.review ? "Reviewing" : "Skipping review"}: ${decision.reason}`,
  );
  if (!decision.review) await ensureLimitComment(github, config);
  if (env.GITHUB_OUTPUT) {
    appendFileSync(env.GITHUB_OUTPUT, `review=${decision.review}\n`);
  }
  return decision;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await run();
}
