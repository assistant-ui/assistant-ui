#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { diffApiSurface, diffExportsMap } from "./diff-api-surface.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { loadReviewPolicy, tierLabel } from "./lib/review-policy.mjs";
import { evaluateRequirements } from "./lib/review-tier-requirements.mjs";
import { computeTier } from "./lib/review-tier-signals.mjs";
import { hasOption, optionValues } from "./lib/script-options.mjs";

const marker = "<!-- review-tier -->";
const rawAccept = "application/vnd.github.raw";

export function createGitHubClient({
  token,
  fetch = globalThis.fetch,
  apiRoot = "https://api.github.com",
}) {
  async function rest(
    method,
    resource,
    body,
    accept = "application/vnd.github+json",
  ) {
    const url = /^https?:\/\//.test(resource)
      ? resource
      : `${apiRoot.replace(/\/$/, "")}/${resource.replace(/^\//, "")}`;
    let status = 0;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: accept,
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      status = response.status;
      if (!response.ok) {
        throw new Error(
          `GitHub request failed (${status} ${response.statusText}): ${method} ${url}`,
        );
      }
      const text = await response.text();
      return {
        status,
        data:
          accept === rawAccept ? text : text === "" ? null : JSON.parse(text),
        headers: response.headers,
      };
    } catch (error) {
      throw Object.assign(
        error instanceof Error ? error : new Error(String(error)),
        { status },
      );
    }
  }

  return {
    rest,
    async paginate(resource) {
      const items = [];
      while (resource) {
        const { data, headers } = await rest("GET", resource);
        items.push(...data);
        resource = /<([^>]+)>;\s*rel="next"/.exec(
          headers.get("link") ?? "",
        )?.[1];
      }
      return items;
    },
    async graphql(query, variables) {
      const { status, data } = await rest("POST", "/graphql", {
        query,
        variables,
      });
      if (data.errors?.length) {
        throw Object.assign(
          new Error(data.errors.map(({ message }) => message).join("; ")),
          { status, types: data.errors.map((error) => error.type) },
        );
      }
      return data.data;
    },
    async raw(resource) {
      try {
        return (await rest("GET", resource, undefined, rawAccept)).data;
      } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    },
  };
}

const pullRequestQuery = `query ReviewTierPullRequest($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      title body isDraft state headRefOid baseRefOid createdAt updatedAt
      author { login __typename }
      labels(first: 100) { nodes { name } }
      labeledEvents: timelineItems(itemTypes: [LABELED_EVENT], last: 100) {
        nodes {
          ... on LabeledEvent { label { name } actor { login } createdAt }
        }
      }
      readyEvents: timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT], last: 1) {
        nodes { ... on ReadyForReviewEvent { createdAt } }
      }
      reviews(first: 100) {
        nodes { author { login __typename } state submittedAt commit { oid } }
        pageInfo { hasNextPage endCursor }
      }
      commits(first: 100) {
        nodes { commit { oid author { user { login } } committer { user { login } } } }
        pageInfo { hasNextPage endCursor }
      }
      closingIssuesReferences(first: 10) { nodes { number } }
    }
  }
}`;

const pullRequestStateQuery = `query ReviewTierPullRequestState($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) { updatedAt headRefOid }
  }
}`;

const reviewsQuery = `query ReviewTierReviews($owner: String!, $name: String!, $number: Int!, $after: String!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviews(first: 100, after: $after) {
        nodes { author { login __typename } state submittedAt commit { oid } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

const commitsQuery = `query ReviewTierCommits($owner: String!, $name: String!, $number: Int!, $after: String!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      commits(first: 100, after: $after) {
        nodes { commit { oid author { user { login } } committer { user { login } } } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

const decisionQuery = `query ReviewTierDecision($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      labels(first: 100) { nodes { name } }
      timelineItems(itemTypes: [LABELED_EVENT], last: 100) {
        nodes { ... on LabeledEvent { label { name } actor { login } createdAt } }
      }
    }
  }
}`;

function withoutHtmlComments(text) {
  let result = text;
  for (
    let start = result.indexOf("<!--");
    start !== -1;
    start = result.indexOf("<!--")
  ) {
    const end = result.indexOf("-->", start + 4);
    result =
      end === -1
        ? result.slice(0, start)
        : result.slice(0, start) + result.slice(end + 3);
  }
  return result;
}

function attributedLabels(node, events = node.timelineItems.nodes) {
  const latest = new Map();
  for (const event of events) {
    if (!event.label) continue;
    const previous = latest.get(event.label.name);
    if (
      !previous ||
      Date.parse(event.createdAt) >= Date.parse(previous.createdAt)
    ) {
      latest.set(event.label.name, event);
    }
  }
  return node.labels.nodes.map(({ name }) => ({
    name,
    addedBy: latest.get(name)?.actor?.login ?? null,
  }));
}

export async function gatherPullRequest(
  client,
  policy,
  number,
  { now = new Date(), people } = {},
) {
  const startedAt = now.toISOString();
  const [owner, name] = policy.repository.split("/");
  const repo = `/repos/${policy.repository}`;
  const data = await client.graphql(pullRequestQuery, { owner, name, number });
  const node = data.repository.pullRequest;
  if (!node) throw new Error(`Pull request #${number} was not found.`);
  async function allNodes(connection, query, key) {
    const nodes = [...connection.nodes];
    while (connection.pageInfo?.hasNextPage) {
      const page = await client.graphql(query, {
        owner,
        name,
        number,
        after: connection.pageInfo.endCursor,
      });
      connection = page.repository.pullRequest[key];
      nodes.push(...connection.nodes);
    }
    return nodes;
  }
  const reviews = await allNodes(node.reviews, reviewsQuery, "reviews");
  const commits = await allNodes(node.commits, commitsQuery, "commits");
  const author = node.author?.login ?? null;
  const labels = attributedLabels(node, node.labeledEvents.nodes);
  const readyForReviewAt =
    node.readyEvents.nodes.map(({ createdAt }) => createdAt).at(-1) ??
    node.createdAt;
  const decisionNumbers = new Set(
    node.closingIssuesReferences.nodes.map((issue) => issue.number),
  );
  const body = withoutHtmlComments(node.body);
  const heading = /^## Decision[ \t]*\r?$/im.exec(body);
  if (heading) {
    const section = body
      .slice(heading.index + heading[0].length)
      .split(/^##[ \t]+/m)[0];
    for (const match of section.matchAll(/#(\d+)\b/g))
      decisionNumbers.add(Number(match[1]));
  }
  const linkedIssues = [];
  for (const issueNumber of decisionNumbers) {
    let result;
    try {
      result = await client.graphql(decisionQuery, {
        owner,
        name,
        number: issueNumber,
      });
    } catch (error) {
      if (
        Array.isArray(error.types) &&
        error.types.length > 0 &&
        error.types.every((type) => type === "NOT_FOUND")
      )
        continue;
      throw error;
    }
    const issue = result.repository.issue;
    if (!issue) continue;
    linkedIssues.push({ number: issueNumber, labels: attributedLabels(issue) });
  }

  const files = (await client.paginate(`${repo}/pulls/${number}/files`)).map(
    (file) => ({
      path: file.filename,
      status: ["added", "removed", "renamed"].includes(file.status)
        ? file.status
        : "modified",
      additions: file.additions,
      deletions: file.deletions,
      previousPath: file.previous_filename ?? null,
      patch: file.patch ?? null,
    }),
  );
  const comparison = await client.rest(
    "GET",
    `${repo}/compare/${node.baseRefOid}...${node.headRefOid}`,
  );
  const mergeBase = comparison.data.merge_base_commit.sha;
  const apiSurface = [];
  const manifests = [];
  const invalidManifests = [];
  const exportsDiffs = [];
  const paths = new Set(
    files.flatMap((file) =>
      file.status === "renamed" && file.previousPath
        ? [file.path, file.previousPath]
        : [file.path],
    ),
  );
  for (const file of paths) {
    const isSurface = /^api-surface\/[^/]+\.ts$/.test(file);
    if (!isSurface && !/^packages\/[^/]+\/package\.json$/.test(file)) continue;
    const contents = `${repo}/contents/${file.split("/").map(encodeURIComponent).join("/")}`;
    const baseText = await client.raw(
      `${contents}?ref=${encodeURIComponent(mergeBase)}`,
    );
    const headText = await client.raw(
      `${contents}?ref=${encodeURIComponent(node.headRefOid)}`,
    );
    if (isSurface) {
      apiSurface.push({ file, diff: diffApiSurface(baseText, headText) });
    } else {
      let base;
      let head;
      try {
        base = baseText === null ? null : JSON.parse(baseText);
        head = headText === null ? null : JSON.parse(headText);
      } catch {
        invalidManifests.push(file);
        manifests.push({ path: file, base: null, head: null });
        continue;
      }
      manifests.push({ path: file, base, head });
      const diff = diffExportsMap(base?.exports, head?.exports);
      if (diff.added.length || diff.removed.length || diff.changed.length) {
        exportsDiffs.push({ path: file, diff });
      }
    }
  }

  const { admins, teams } = people ?? (await gatherPeople(client, policy));
  let authorHasWriteAccess = false;
  let openPullRequestCount = 0;
  if (author !== null) {
    try {
      const permission = await client.rest(
        "GET",
        `${repo}/collaborators/${encodeURIComponent(author)}/permission`,
      );
      authorHasWriteAccess = ["admin", "maintain", "write"].includes(
        permission.data.permission,
      );
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    const search = await client.graphql(
      `query ReviewTierAuthorCount($query: String!) {
      search(query: $query, type: ISSUE) { issueCount }
    }`,
      {
        query: `repo:${policy.repository} is:pr is:open draft:false author:${author}`,
      },
    );
    openPullRequestCount = search.search.issueCount;
  }
  return {
    startedAt,
    pr: {
      number,
      title: node.title,
      author,
      isDraft: node.isDraft,
      state: node.state,
      headSha: node.headRefOid,
      updatedAt: node.updatedAt,
    },
    signalsInput: {
      title: node.title,
      labels: labels.map(({ name: label }) => label),
      files,
      apiSurface,
      manifests,
      invalidManifests,
      exportsDiffs,
    },
    people: {
      author,
      authorHasWriteAccess,
      headSha: node.headRefOid,
      commits: commits.map(({ commit }) => ({
        sha: commit.oid,
        author: commit.author?.user?.login ?? null,
        committer: commit.committer?.user?.login ?? null,
      })),
      reviews: reviews.map((review) => ({
        author: review.author?.login ?? null,
        isBot: review.author?.__typename === "Bot",
        state: review.state,
        submittedAt: review.submittedAt,
        commitSha: review.commit?.oid ?? null,
      })),
      labels,
      linkedIssues,
      readyForReviewAt,
      now: now.toISOString(),
      openPullRequestCount,
      admins,
      teams,
    },
  };
}

export async function gatherPeople(client, policy) {
  const [owner] = policy.repository.split("/");
  let admins;
  try {
    admins = (await client.paginate(`/orgs/${owner}/members?role=admin`)).map(
      ({ login }) => login,
    );
  } catch (error) {
    if (error.status !== 404) throw error;
    admins = [];
    console.warn(
      `Organization ${owner} does not exist; counting owners as empty.`,
    );
  }
  const teamSlugs = new Set([
    policy.teams.maintainers,
    policy.teams.reviewers,
    ...policy.areas.map(({ ownerTeam }) => ownerTeam),
  ]);
  const teams = {};
  for (const slug of teamSlugs) {
    try {
      teams[slug] = (
        await client.paginate(
          `/orgs/${owner}/teams/${encodeURIComponent(slug)}/members`,
        )
      ).map(({ login }) => login);
    } catch (error) {
      if (error.status !== 404) throw error;
      teams[slug] = [];
      console.warn(`Team ${slug} does not exist; counting it as empty.`);
    }
  }
  return { admins, teams };
}

export function evaluatePullRequest(gathered, policy) {
  const tierResult = computeTier(gathered.signalsInput, policy);
  const { tier, areas, failures } = tierResult;
  const requirementResult = evaluateRequirements(
    { ...gathered.people, tier, areas, failures },
    policy,
  );
  return {
    tierResult,
    requirementResult,
    conclusion:
      requirementResult.status === "pending"
        ? "action_required"
        : requirementResult.status,
  };
}

export function renderComment({ tierResult, requirementResult }, policy) {
  const reasons = tierResult.reasons.toSorted((a, b) => b.tier - a.tier);
  const line = (value) => value.replace(/\s+/g, " ").trim();
  const reasonText = ({ code, detail }) => `${code}: ${line(detail)}`;
  const { unmet, waived, approvals } = requirementResult;
  return [
    marker,
    `T${tierResult.tier} (${tierLabel(policy, tierResult.tier)}): ${reasons.length ? reasonText(reasons[0]) : "No risk signals"}`,
    "",
    "Reasons:",
    "",
    ...reasons.slice(0, 10).map((reason) => `- ${reasonText(reason)}`),
    ...(reasons.length > 10 ? [`and ${reasons.length - 10} more`] : []),
    "",
    "Still needed:",
    "",
    ...(unmet.length
      ? unmet.map((item) => `- ${reasonText(item)}`)
      : ["None. Ready to merge."]),
    "",
    "Waived overrides:",
    "",
    ...(waived.length
      ? waived.map(
          ({ code, signal, by }) =>
            `- ${code}: waived by ${by} with ${policy.labels.overridePrefix}${signal}.`,
        )
      : ["None."]),
    "",
    "Counted approvals:",
    "",
    ...(approvals.counted.length
      ? approvals.counted.map(
          (login) =>
            `- ${login}: trusted approval on the current head from someone who did not author or commit any of its commits.`,
        )
      : ["None."]),
    "",
    "Ignored approvals:",
    "",
    ...(approvals.ignored.length
      ? approvals.ignored.map(({ login, reason }) => `- ${login}: ${reason}.`)
      : ["None."]),
  ].join("\n");
}

export async function publish(
  client,
  policy,
  {
    number,
    headSha,
    checkSha,
    evaluation,
    startedAt = new Date().toISOString(),
    labelsAndComment = true,
  },
) {
  const repo = `/repos/${policy.repository}`;
  const body = renderComment(evaluation, policy);
  const { tier } = evaluation.tierResult;
  const ready = evaluation.conclusion === "success";
  const targetSha = checkSha ?? headSha;
  const check = {
    name: policy.reviewTierCheck.name,
    head_sha: targetSha,
    started_at: startedAt,
    status: "completed",
    conclusion:
      policy.reviewTierCheck.mode === "shadow" && !ready
        ? "neutral"
        : evaluation.conclusion,
    output: {
      title:
        `T${tier}: ${ready ? "ready" : evaluation.requirementResult.unmet[0].detail}`.slice(
          0,
          255,
        ),
      summary: body.slice(marker.length + 1),
    },
  };
  const { data } = await client.rest(
    "GET",
    `${repo}/commits/${encodeURIComponent(targetSha)}/check-runs?check_name=${encodeURIComponent(policy.reviewTierCheck.name)}&filter=latest`,
  );
  const latest = data.check_runs.find(
    (run) =>
      policy.reviewTierCheck.integrationId === null ||
      run.app?.id === policy.reviewTierCheck.integrationId,
  );
  if (Date.parse(latest?.started_at) > Date.parse(startedAt)) return;
  if (
    latest?.conclusion !== check.conclusion ||
    latest.output?.title !== check.output.title ||
    latest.output?.summary !== check.output.summary
  ) {
    await client.rest("POST", `${repo}/check-runs`, {
      ...check,
      completed_at: new Date().toISOString(),
    });
  }
  if (!labelsAndComment) return;
  const label = tierLabel(policy, tier);
  const labels = await client.paginate(`${repo}/issues/${number}/labels`);
  if (!labels.some(({ name }) => name === label)) {
    await client.rest("POST", `${repo}/issues/${number}/labels`, {
      labels: [label],
    });
  }
  for (const { name } of labels) {
    if (name.startsWith(policy.labels.tierPrefix) && name !== label) {
      await client.rest(
        "DELETE",
        `${repo}/issues/${number}/labels/${encodeURIComponent(name)}`,
      );
    }
  }
  const comments = await client.paginate(`${repo}/issues/${number}/comments`);
  const sticky = comments.find(
    (comment) =>
      comment.user?.type === "Bot" && comment.body?.startsWith(marker),
  );
  if (!sticky) {
    await client.rest("POST", `${repo}/issues/${number}/comments`, { body });
  } else if (sticky.body !== body) {
    await client.rest("PATCH", `${repo}/issues/comments/${sticky.id}`, {
      body,
    });
  }
}

const openPullRequestsQuery = `query ReviewTierOpenPullRequests($owner: String!, $name: String!, $after: String, $labels: [String!]) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 100, after: $after, labels: $labels) {
      nodes { number isDraft }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const authorPullRequestsQuery = `query ReviewTierAuthorPullRequests($query: String!, $after: String) {
  search(query: $query, type: ISSUE, first: 100, after: $after) {
    nodes { ... on PullRequest { number } }
    pageInfo { hasNextPage endCursor }
  }
}`;

function pullRequestNumber(value) {
  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  ) {
    throw new Error(
      "Pull request number must contain only digits and be a positive safe integer.",
    );
  }
  return Number(value);
}

export async function main({
  args = process.argv.slice(2),
  env = process.env,
  client,
  policy = loadReviewPolicy(path.resolve(import.meta.dirname, "..")),
  readFile = readFileSync,
  now,
} = {}) {
  const values = optionValues(args, "--pr");
  if (values.length > 1) throw new Error("--pr may be specified only once.");
  let numbers = [];
  let labels = null;
  let listOpen = false;
  let checkSha;
  let mergeGroup = false;
  let siblingAuthor = null;
  let excludedNumber;
  if (values.length) {
    numbers = [pullRequestNumber(values[0])];
  } else {
    const event = env.GITHUB_EVENT_PATH
      ? JSON.parse(readFile(env.GITHUB_EVENT_PATH, "utf8"))
      : {};
    switch (env.GITHUB_EVENT_NAME) {
      case "pull_request_target":
        if (
          event.action === "closed" ||
          event.action === "converted_to_draft"
        ) {
          siblingAuthor = event.pull_request.user?.login ?? null;
          if (siblingAuthor === null) return 0;
          excludedNumber = pullRequestNumber(event.pull_request.number);
        } else if (event.pull_request.draft) {
          return 0;
        } else {
          numbers = [pullRequestNumber(event.pull_request.number)];
        }
        break;
      case "merge_group": {
        const match =
          /^refs\/heads\/gh-readonly-queue\/.+\/pr-(\d+)-[a-f\d]+$/i.exec(
            event.merge_group.head_ref,
          );
        if (!match)
          throw new Error(
            "Merge group ref does not contain a pull request number.",
          );
        numbers = [pullRequestNumber(match[1])];
        checkSha = event.merge_group.head_sha;
        if (!checkSha) throw new Error("Merge group head SHA is required.");
        mergeGroup = true;
        break;
      }
      case "issues":
        if (event.label?.name !== policy.labels.decisionAccepted) return 0;
        labels = [tierLabel(policy, 3)];
        listOpen = true;
        break;
      case "workflow_run":
        numbers = [
          pullRequestNumber(
            readFile(
              env.REVIEW_TIER_RELAY_FILE ?? "review-tier-pr/number",
              "utf8",
            ).trim(),
          ),
        ];
        break;
      case "workflow_dispatch":
        if (event.inputs?.pr) {
          numbers = [pullRequestNumber(event.inputs.pr)];
          break;
        }
        listOpen = true;
        break;
      case "schedule":
        labels = [tierLabel(policy, 2), tierLabel(policy, 3)];
        listOpen = true;
        break;
      default:
        return 0;
    }
  }
  if (!client) {
    if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is required.");
    client = createGitHubClient({ token: env.GITHUB_TOKEN });
  }
  let people;
  if (siblingAuthor !== null) {
    people = await gatherPeople(client, policy);
    if (
      people.admins.includes(siblingAuthor) ||
      (people.teams[policy.teams.maintainers] ?? []).includes(siblingAuthor)
    )
      return 0;
    let after = null;
    do {
      const data = await client.graphql(authorPullRequestsQuery, {
        query: `repo:${policy.repository} is:pr is:open draft:false author:${siblingAuthor}`,
        after,
      });
      const connection = data.search;
      numbers.push(
        ...connection.nodes
          .filter((node) => node.number && node.number !== excludedNumber)
          .map(({ number }) => number),
      );
      after = connection.pageInfo.hasNextPage
        ? connection.pageInfo.endCursor
        : null;
    } while (after !== null);
  }
  if (listOpen) {
    const [owner, name] = policy.repository.split("/");
    let after = null;
    do {
      const data = await client.graphql(openPullRequestsQuery, {
        owner,
        name,
        after,
        labels,
      });
      const connection = data.repository.pullRequests;
      numbers.push(
        ...connection.nodes
          .filter((node) => !node.isDraft)
          .map(({ number }) => number),
      );
      after = connection.pageInfo.hasNextPage
        ? connection.pageInfo.endCursor
        : null;
    } while (after !== null);
  }
  let exitCode = 0;
  for (const number of new Set(numbers)) {
    try {
      people ??= await gatherPeople(client, policy);
      const gathered = await gatherPullRequest(client, policy, number, {
        now: now ?? new Date(),
        people,
      });
      if (gathered.pr.isDraft && !mergeGroup) continue;
      const evaluation = evaluatePullRequest(gathered, policy);
      if (hasOption(args, "--dry-run")) {
        console.log(JSON.stringify(evaluation, null, 2));
      } else {
        const [owner, name] = policy.repository.split("/");
        const current = (
          await client.graphql(pullRequestStateQuery, { owner, name, number })
        ).repository.pullRequest;
        if (
          current?.updatedAt !== gathered.pr.updatedAt ||
          current?.headRefOid !== gathered.pr.headSha
        ) {
          console.log(
            `Pull request #${number} changed during evaluation; skipping publish.`,
          );
          continue;
        }
        await publish(client, policy, {
          number,
          headSha: gathered.pr.headSha,
          checkSha,
          evaluation,
          startedAt: gathered.startedAt,
          labelsAndComment: !mergeGroup,
        });
      }
    } catch (error) {
      console.error(`Pull request #${number}: ${error.message}`);
      exitCode = 1;
    }
  }
  return exitCode;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
