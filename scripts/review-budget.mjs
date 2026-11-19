// Gates automatic fork reviews on this workflow's own run history: at most
// REVIEW_BUDGET_PER_AUTHOR per PR author and REVIEW_BUDGET_REPO repo-wide per
// 24h. A PR with REVIEW_BUDGET_LABEL is exempt. Writes review=true|false.
import { appendFileSync } from "node:fs";
import { createGitHubClient } from "./lib/review-github-client.mjs";

const marker = "<!-- claude-review-budget -->";

// Counts runs in the last 24h whose review job ran (any state but skipped).
// The budget job is named `<job>-budget (<author>)` so a later run can tell
// whose PR each review was for; relayed runs have no pull_requests entry, and
// their head repository is this one, because workflow_run runs the default
// branch.
export async function countReviews(
  github,
  { repo, event, runId, job, author },
  now = Date.now(),
) {
  const since = new Date(now - 24 * 3600 * 1000).toISOString();
  const counts = { author: 0, repo: 0 };
  for (let page = 1; ; page++) {
    const { data } = await github.rest(
      "GET",
      `repos/${repo}/actions/workflows/claude-code-review.yml/runs?event=${event}&created=${encodeURIComponent(`>=${since}`)}&per_page=100&page=${page}`,
    );
    // The API returns at most 1000 filtered runs; past that, fail closed.
    if (data.total_count > 1000) return { author: Infinity, repo: Infinity };
    for (const run of data.workflow_runs) {
      if (run.id === runId) continue;
      const { data: jobs } = await github.rest(
        "GET",
        `repos/${repo}/actions/runs/${run.id}/jobs?filter=latest`,
      );
      const review = jobs.jobs.find((j) => j.name === job);
      if (!review || review.conclusion === "skipped") continue;
      counts.repo++;
      const budget = jobs.jobs.find((j) =>
        j.name.startsWith(`${job}-budget (`),
      );
      const runAuthor =
        budget?.name.slice(job.length + 9, -1) ?? run.actor?.login;
      if (runAuthor?.toLowerCase() === author.toLowerCase()) counts.author++;
    }
    if (data.workflow_runs.length < 100) return counts;
  }
}

if (import.meta.main) {
  const env = process.env;
  const github = createGitHubClient({ token: env.GITHUB_TOKEN });
  const repo = env.GITHUB_REPOSITORY;
  const label = env.REVIEW_BUDGET_LABEL;
  let review = JSON.parse(env.PR_LABELS).includes(label);
  if (!review) {
    const counts = await countReviews(github, {
      repo,
      event: env.GITHUB_EVENT_NAME,
      runId: Number(env.GITHUB_RUN_ID),
      job: "claude-fork-review",
      author: env.PR_AUTHOR,
    });
    console.log(
      `${env.PR_AUTHOR}: ${counts.author} reviews, repo: ${counts.repo} reviews in 24h`,
    );
    review =
      counts.author < Number(env.REVIEW_BUDGET_PER_AUTHOR) &&
      counts.repo < Number(env.REVIEW_BUDGET_REPO);
  }
  if (!review) {
    const path = `repos/${repo}/issues/${env.PR_NUMBER}/comments`;
    const comments = await github.paginate(`${path}?per_page=100`);
    if (
      !comments.some(
        (c) =>
          c.user.login === "github-actions[bot]" && c.body.includes(marker),
      )
    ) {
      await github.rest("POST", path, {
        body: `${marker}\nAutomatic review limit reached for today. A maintainer can request a review by adding the \`${label}\` label.`,
      });
    }
  }
  appendFileSync(env.GITHUB_OUTPUT, `review=${review}\n`);
}
