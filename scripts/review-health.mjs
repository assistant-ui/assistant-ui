#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isExecutedAsMain } from "./lib/main.mjs";
import {
  loadReviewPolicy,
  overrideSignal,
  parseTitleType,
  tierLabel,
} from "./lib/review-policy.mjs";
import { hasOption, optionValues } from "./lib/script-options.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const apiRoot = "https://api.github.com";
const decisiveStates = new Set(["APPROVED", "CHANGES_REQUESTED", "DISMISSED"]);

const loginKey = (login) => login?.toLowerCase();
const loginKeys = (logins) => logins.map(loginKey);

function countedApprovers(pr) {
  const latest = new Map();
  for (const review of pr.reviews) {
    const login = loginKey(review.author);
    if (
      !login ||
      login === loginKey(pr.author) ||
      review.isBot ||
      !decisiveStates.has(review.state)
    )
      continue;
    const previous = latest.get(login);
    if (!previous || review.submittedAt >= previous.submittedAt)
      latest.set(login, review);
  }
  return new Set(
    [...latest]
      .filter(([, review]) => review.state === "APPROVED")
      .map(([login]) => login),
  );
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function computeReviewHealth(
  { pullRequests, ruleSuites, people },
  policy,
) {
  const admins = new Set(loginKeys(people.admins));
  const maintainerSet = new Set([
    ...admins,
    ...loginKeys(people.teams[policy.teams.maintainers] ?? []),
  ]);
  const trusted = new Set([
    ...maintainerSet,
    ...loginKeys(people.teams[policy.teams.reviewers] ?? []),
  ]);
  const tierCounts = { 0: 0, 1: 0, 2: 0, 3: 0, untiered: 0 };
  const missingApprovals = [];
  const adminMergesBelowMinimum = [];
  const singleReviewerMerges = [];
  const t0SelfMerges = [];
  const overrideUses = [];
  const reverts = [];
  const responseHours = [];
  let outsidePullRequests = 0;
  const byMergeSha = new Map();

  for (const pr of pullRequests) {
    if (pr.mergeCommitSha) byMergeSha.set(pr.mergeCommitSha, pr.number);
    const author = loginKey(pr.author);
    const mergedBy = loginKey(pr.mergedBy);
    const tier = [0, 1, 2, 3].find((candidate) =>
      pr.labels.includes(tierLabel(policy, candidate)),
    );
    tierCounts[tier ?? "untiered"]++;
    const approvers = countedApprovers(pr);
    const minimum =
      tier === 0
        ? maintainerSet.has(author)
          ? 0
          : 1
        : tier === 1
          ? trusted.has(author)
            ? 1
            : 2
          : tier === 2 || tier === 3
            ? 2
            : null;
    const maintainerApprovals = [...approvers].filter((login) =>
      maintainerSet.has(login),
    ).length;
    const counted =
      tier === 2 || tier === 3
        ? maintainerApprovals
        : [...approvers].filter((login) => trusted.has(login)).length;
    const needsMaintainer = tier === 1 && !trusted.has(author);
    if (
      minimum !== null &&
      (counted < minimum || (needsMaintainer && maintainerApprovals === 0))
    ) {
      missingApprovals.push({
        number: pr.number,
        tier,
        approvals: counted,
        minimum,
      });
      if (admins.has(mergedBy) && mergedBy !== author)
        adminMergesBelowMinimum.push(pr.number);
    }
    if (!maintainerSet.has(author)) {
      outsidePullRequests++;
      if (approvers.size === 1 && approvers.has(mergedBy))
        singleReviewerMerges.push(pr.number);
      if (pr.readyForReviewAt && pr.firstMaintainerResponseAt) {
        const hours =
          (Date.parse(pr.firstMaintainerResponseAt) -
            Date.parse(pr.readyForReviewAt)) /
          3_600_000;
        if (Number.isFinite(hours) && hours >= 0) responseHours.push(hours);
      }
    }
    if (tier === 0 && mergedBy === author && approvers.size === 0)
      t0SelfMerges.push(pr.number);
    if (pr.labels.some((label) => overrideSignal(policy, label) !== null))
      overrideUses.push(pr.number);
    if (parseTitleType(policy, pr.title) === "revert") reverts.push(pr.number);
  }

  const adminBypasses = [];
  const outsideBypasses = [];
  const seenSuites = new Set();
  for (const suite of ruleSuites) {
    if (seenSuites.has(suite.id)) continue;
    seenSuites.add(suite.id);
    if (suite.result !== "bypass") continue;
    const item = {
      id: suite.id,
      actorName: suite.actorName,
      number: byMergeSha.get(suite.afterSha) ?? null,
    };
    (admins.has(loginKey(suite.actorName))
      ? adminBypasses
      : outsideBypasses
    ).push(item);
  }

  return {
    totalMerges: pullRequests.length,
    tierCounts,
    missingApprovals,
    adminBypasses,
    outsideBypasses,
    adminMergesBelowMinimum,
    singleReviewerMerges,
    t0SelfMerges,
    overrideUses,
    reverts,
    medianResponseHours: median(responseHours),
    responseCount: responseHours.length,
    outsidePullRequests,
  };
}

export function renderReviewHealth(metrics, { since, until }) {
  const list = (entries) =>
    entries.length
      ? entries
          .map((entry) =>
            typeof entry === "number"
              ? `#${entry}`
              : entry.number === null
                ? `Unmatched rule suite ${entry.id}`
                : `#${entry.number}`,
          )
          .join(", ")
      : "None";
  const hours =
    metrics.medianResponseHours === null
      ? "No responses recorded"
      : `${Number(metrics.medianResponseHours.toFixed(1))} hours (${metrics.responseCount} of ${metrics.outsidePullRequests} PRs)`;
  return [
    `# Review health, ${since} to ${until}`,
    "",
    `${metrics.totalMerges} merges. T0: ${metrics.tierCounts[0]}, T1: ${metrics.tierCounts[1]}, T2: ${metrics.tierCounts[2]}, T3: ${metrics.tierCounts[3]}, untiered: ${metrics.tierCounts.untiered}.`,
    "",
    "| Measure | This period | Target |",
    "| --- | ---: | --- |",
    `| Merges missing their tier's approvals | ${metrics.missingApprovals.length} | 0 |`,
    `| Bypasses outside the organization owners | ${metrics.outsideBypasses.length} | 0 |`,
    `| Organization owner bypasses | ${metrics.adminBypasses.length} | Listed below |`,
    `| Non-maintainer PRs approved and merged by one person | ${metrics.singleReviewerMerges.length} | 0 |`,
    `| First maintainer response on outside PRs, median hours | ${hours} | Within 2 business days |`,
    `| Reverts | ${metrics.reverts.length} | Tracked |`,
    `| Override uses | ${metrics.overrideUses.length} | Tracked |`,
    "",
    `- Merges missing their tier's approvals: ${list(metrics.missingApprovals)}`,
    `- Bypasses outside the organization owners: ${list(metrics.outsideBypasses)}`,
    `- Organization owner bypasses: ${list(metrics.adminBypasses)}`,
    `- Organization owner merges of someone else's PR below the tier minimum: ${list(metrics.adminMergesBelowMinimum)}`,
    `- Non-maintainer PRs approved and merged by one person: ${list(metrics.singleReviewerMerges)}`,
    `- T0 self-merges with no approvals: ${list(metrics.t0SelfMerges)}`,
    `- Override uses: ${list(metrics.overrideUses)}`,
    `- Reverts: ${list(metrics.reverts)}`,
    "",
  ].join("\n");
}

async function request(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw Object.assign(
      new Error(
        `GitHub request failed (${response.status} ${response.statusText}): ${url}`,
      ),
      {
        status: response.status,
      },
    );
  }
  return {
    data: await response.json(),
    next: /<([^>]+)>; rel="next"/.exec(response.headers.get("link") ?? "")?.[1],
  };
}

async function graphql(query, variables, token) {
  const { data } = await request(`${apiRoot}/graphql`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (data.errors?.length)
    throw new Error(data.errors.map((error) => error.message).join("; "));
  return data.data;
}

const mergedQuery = `query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}, first: 100, after: $after) {
      nodes {
        number title createdAt updatedAt mergedAt headRefOid additions deletions
        author { login __typename }
        mergedBy { login }
        mergeCommit { oid }
        labels(first: 100) { nodes { name } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const detailsQuery = `query($owner: String!, $name: String!, $number: Int!, $reviewsAfter: String, $commentsAfter: String, $eventsAfter: String, $loadReviews: Boolean!, $loadComments: Boolean!, $loadEvents: Boolean!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviews(first: 100, after: $reviewsAfter) @include(if: $loadReviews) {
        nodes { author { login __typename } state submittedAt commit { oid } }
        pageInfo { hasNextPage endCursor }
      }
      comments(first: 100, after: $commentsAfter) @include(if: $loadComments) {
        nodes { author { login } createdAt }
        pageInfo { hasNextPage endCursor }
      }
      timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT], first: 100, after: $eventsAfter) @include(if: $loadEvents) {
        nodes { ... on ReadyForReviewEvent { createdAt } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

async function pullRequestDetails(owner, name, number, token) {
  const reviews = [];
  const comments = [];
  const events = [];
  const cursors = {
    reviewsAfter: null,
    commentsAfter: null,
    eventsAfter: null,
  };
  const active = { reviews: true, comments: true, timelineItems: true };
  while (Object.values(active).some(Boolean)) {
    const data = await graphql(
      detailsQuery,
      {
        owner,
        name,
        number,
        ...cursors,
        loadReviews: active.reviews,
        loadComments: active.comments,
        loadEvents: active.timelineItems,
      },
      token,
    );
    const pr = data.repository.pullRequest;
    if (!pr) throw new Error(`Pull request #${number} was not found.`);
    for (const [key, target, cursor] of [
      ["reviews", reviews, "reviewsAfter"],
      ["comments", comments, "commentsAfter"],
      ["timelineItems", events, "eventsAfter"],
    ]) {
      if (!active[key]) continue;
      target.push(...pr[key].nodes);
      active[key] = pr[key].pageInfo.hasNextPage;
      cursors[cursor] = active[key] ? pr[key].pageInfo.endCursor : null;
    }
  }
  return { reviews, comments, events };
}

async function fetchPullRequests(policy, people, since, untilExclusive, token) {
  const [owner, name] = policy.repository.split("/");
  const maintainers = new Set([
    ...loginKeys(people.admins),
    ...loginKeys(people.teams[policy.teams.maintainers] ?? []),
  ]);
  const pullRequests = [];
  let after = null;
  while (true) {
    const data = await graphql(mergedQuery, { owner, name, after }, token);
    const connection = data.repository.pullRequests;
    for (const node of connection.nodes) {
      if (
        !node.mergedAt ||
        node.mergedAt < since ||
        node.mergedAt >= untilExclusive
      )
        continue;
      const { reviews, comments, events } = await pullRequestDetails(
        owner,
        name,
        node.number,
        token,
      );
      const readyForReviewAt = events.at(-1)?.createdAt ?? node.createdAt;
      const firstMaintainerResponseAt =
        [
          ...reviews.map((review) => ({
            author: review.author?.login,
            at: review.submittedAt,
          })),
          ...comments.map((comment) => ({
            author: comment.author?.login,
            at: comment.createdAt,
          })),
        ]
          .filter(
            ({ author, at }) =>
              maintainers.has(loginKey(author)) && at >= readyForReviewAt,
          )
          .map(({ at }) => at)
          .sort()[0] ?? null;
      pullRequests.push({
        number: node.number,
        title: node.title,
        author: node.author?.login ?? null,
        authorIsBot: node.author?.__typename === "Bot",
        mergedBy: node.mergedBy?.login ?? null,
        mergedAt: node.mergedAt,
        mergeCommitSha: node.mergeCommit?.oid ?? null,
        labels: node.labels.nodes.map(({ name: label }) => label),
        reviews: reviews.map((review) => ({
          author: review.author?.login ?? null,
          isBot: review.author?.__typename === "Bot",
          state: review.state,
          submittedAt: review.submittedAt,
          commitSha: review.commit?.oid ?? null,
        })),
        headSha: node.headRefOid,
        additions: node.additions,
        deletions: node.deletions,
        readyForReviewAt,
        firstMaintainerResponseAt,
      });
    }
    if (
      !connection.pageInfo.hasNextPage ||
      connection.nodes.at(-1)?.updatedAt < since
    )
      break;
    after = connection.pageInfo.endCursor;
  }
  return pullRequests;
}

async function fetchMembers(url, token) {
  const members = [];
  while (url) {
    const response = await request(url, token);
    members.push(...response.data.map(({ login }) => login));
    url = response.next;
  }
  return members;
}

async function fetchPeople(policy, token) {
  const [org] = policy.repository.split("/");
  const orgUrl = `${apiRoot}/orgs/${encodeURIComponent(org)}`;
  const admins = await fetchMembers(
    `${orgUrl}/members?role=admin&per_page=100`,
    token,
  );
  const teams = {};
  for (const slug of new Set([
    policy.teams.maintainers,
    policy.teams.reviewers,
  ])) {
    try {
      teams[slug] = await fetchMembers(
        `${orgUrl}/teams/${encodeURIComponent(slug)}/members?per_page=100`,
        token,
      );
    } catch (error) {
      if (error.status !== 404) throw error;
      console.warn(`Team ${slug} does not exist; counting it as empty.`);
      teams[slug] = [];
    }
  }
  return { admins, teams };
}

async function fetchRuleSuites(policy, since, untilExclusive, token) {
  const suites = [];
  const seen = new Set();
  let url = `${apiRoot}/repos/${policy.repository}/rulesets/rule-suites?ref=refs%2Fheads%2Fmain&time_period=month&per_page=100`;
  while (url) {
    const response = await request(url, token);
    for (const suite of response.data) {
      if (seen.has(suite.id)) continue;
      seen.add(suite.id);
      if (suite.pushed_at < since || suite.pushed_at >= untilExclusive)
        continue;
      suites.push({
        id: suite.id,
        actorName: suite.actor_name,
        result: suite.result,
        afterSha: suite.after_sha,
        pushedAt: suite.pushed_at,
      });
    }
    url = response.next;
  }
  return suites;
}

function dateOption(args, name, fallback) {
  const values = optionValues(args, name);
  if (values.length > 1) throw new Error(`${name} may be specified only once.`);
  const value = values[0] ?? fallback;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${name} must be a date in YYYY-MM-DD format.`);
  }
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  if (hasOption(args, "--help")) {
    console.log(
      "Usage: node scripts/review-health.mjs --since YYYY-MM-DD [--until YYYY-MM-DD] [--post ISSUE_NUMBER]",
    );
    return;
  }
  const since = dateOption(args, "--since");
  const until = dateOption(
    args,
    "--until",
    new Date().toISOString().slice(0, 10),
  );
  const untilExclusive = new Date(`${until}T00:00:00Z`);
  untilExclusive.setUTCDate(untilExclusive.getUTCDate() + 1);
  if (since > until) throw new Error("--since must be on or before --until.");
  const oldestCovered = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (since < oldestCovered) {
    throw new Error(
      `--since must be on or after ${oldestCovered}, because GitHub returns rule suites for the last month only.`,
    );
  }
  const issueValues = optionValues(args, "--post");
  if (
    issueValues.length > 1 ||
    (issueValues.length && !/^[1-9]\d*$/.test(issueValues[0]))
  )
    throw new Error("--post must be a positive issue number specified once.");
  const policy = loadReviewPolicy(repoRoot);
  const token =
    process.env.GITHUB_TOKEN ||
    execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  if (!token) throw new Error("GITHUB_TOKEN or gh auth token is required.");
  const sinceTime = `${since}T00:00:00Z`;
  const untilTime = untilExclusive.toISOString();
  const people = await fetchPeople(policy, token);
  const pullRequests = await fetchPullRequests(
    policy,
    people,
    sinceTime,
    untilTime,
    token,
  );
  const ruleSuites = await fetchRuleSuites(policy, sinceTime, untilTime, token);
  const body = renderReviewHealth(
    computeReviewHealth({ pullRequests, ruleSuites, people }, policy),
    { since, until },
  );
  console.log(body);
  if (issueValues.length) {
    await request(
      `${apiRoot}/repos/${policy.repository}/issues/${issueValues[0]}`,
      token,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
    );
  }
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
