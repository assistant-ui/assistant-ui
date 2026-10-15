#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { diffApiSurface, diffExportsMap } from "./diff-api-surface.mjs";
import { isExecutedAsMain } from "./lib/main.mjs";
import { loadReviewPolicy, tierLabel } from "./lib/review-policy.mjs";
import { advise, sectionText } from "./lib/review-tier-advice.mjs";
import { evaluateRequirements } from "./lib/review-tier-requirements.mjs";
import { computeTier } from "./lib/review-tier-signals.mjs";
import { hasOption, optionValues } from "./lib/script-options.mjs";

const marker = "<!-- review-tier -->";
const rawAccept = "application/vnd.github.raw";
const transientStatuses = new Set([0, 502, 503, 504]);
export const dailySweepCron = "0 4 * * *";

export function createGitHubClient({
  token,
  fetch = globalThis.fetch,
  apiRoot = "https://api.github.com",
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  async function rest(
    method,
    resource,
    body,
    accept = "application/vnd.github+json",
  ) {
    const retries = method === "GET" || resource === "/graphql" ? 2 : 0;
    for (let attempt = 0; ; attempt++) {
      try {
        return await request(method, resource, body, accept);
      } catch (error) {
        if (attempt === retries || !transientStatuses.has(error.status))
          throw error;
        await wait(1000 * 2 ** attempt);
      }
    }
  }

  async function request(method, resource, body, accept) {
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
      const text = await response.text().catch((error) => {
        status = 0;
        throw error;
      });
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

const issuePullRequestsFields = `number repository { nameWithOwner }
  closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
    nodes { number state repository { nameWithOwner } }
  }`;

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
      closingIssuesReferences(first: 10) { nodes { ${issuePullRequestsFields} } }
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
      ${issuePullRequestsFields}
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
  const withPullRequests = (issue) => ({
    number: issue.number,
    repository: issue.repository.nameWithOwner,
    pullRequests: issue.closedByPullRequestsReferences.nodes.map((other) => ({
      number: other.number,
      state: other.state,
      repository: other.repository.nameWithOwner,
    })),
  });
  const adviceIssues = node.closingIssuesReferences.nodes.map(withPullRequests);
  // Decision labels live on this repository's issues, so a closing issue in
  // another repository is never looked up here by its bare number.
  const decisionNumbers = new Set(
    adviceIssues
      .filter((issue) => issue.repository === policy.repository)
      .map((issue) => issue.number),
  );
  const closingNumbers = new Set(decisionNumbers);
  const body = withoutHtmlComments(node.body);
  for (const match of (sectionText(body, "Decision") ?? "").matchAll(
    /#(\d+)\b/g,
  ))
    decisionNumbers.add(Number(match[1]));
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
    if (!closingNumbers.has(issueNumber))
      adviceIssues.push(withPullRequests(issue));
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
    adviceInput: {
      number,
      title: node.title,
      body,
      authorIsBot: node.author?.__typename === "Bot",
      hasLinkedIssue: linkedIssues.length > 0,
      linkedIssues: adviceIssues,
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
    advice: advise(gathered.adviceInput, policy),
    context: {
      headSha: gathered.pr.headSha,
      readyForReviewAt: gathered.people.readyForReviewAt,
    },
    conclusion:
      requirementResult.status === "pending"
        ? "action_required"
        : requirementResult.status,
  };
}

const tierNames = ["low risk", "package code", "contract", "decision"];
const signalLabels = {
  "decision-path": "decision path",
  "contract-area": "contract area",
  "contract-docs": "contract docs",
  "low-risk-path": "low risk path",
  "test-addition": "new test",
  "test-change": "test change",
  source: "package source",
  "new-package": "new package",
  deprecation: "new @deprecated",
  "ci-permissions": "workflow permissions, secrets or triggers",
  "behavior-change-label": "behavior-change label",
  "entry-point-added": "new entry point",
  "entry-point-removed": "removed entry point",
  "export-added": "new export",
  "export-removed": "removed export",
  "declaration-changed": "changed public type",
  "exports-map-changed": "changed exports map",
  "new-runtime-dependency": "new runtime dependency",
  "upstream-major": "upstream major",
  "manifest-contract-field": "manifest contract field",
  "cross-package-refactor": "refactor across packages",
  "no-files": "no changed files",
};
const requirementLabels = {
  approvals: "Approvals",
  decision: "Decision",
  window: "Waiting window",
  "size-cap": "Size",
  "unknown-type": "Title type",
  "refactor-changes-api": "Refactor claim",
  "refactor-changes-exports": "Refactor claim",
  "refactor-changes-assertions": "Refactor claim",
  "manifest-invalid": "Manifest",
  "open-pr-cap": "Open pull requests",
};
const ignoredLabels = {
  author: "author",
  bot: "bot",
  untrusted: "not a maintainer or reviewer",
  stale: "approved an older head",
  contributor: "wrote a commit here",
};

const cell = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
const code = (value) => {
  const text = cell(value);
  const fence = "`".repeat(
    Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length)) + 1,
  );
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
};
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const mdTable = (header, aligns, rows) =>
  [
    `| ${header.join(" | ")} |`,
    `| ${aligns.join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
const isWaiting = (code) =>
  code === "approvals" ||
  code === "decision" ||
  code === "window" ||
  code.startsWith("owner:");
const areaName = (id, policy) =>
  policy.areas.find((area) => area.id === id)?.name ?? id;
const requirementLabel = (code, policy) =>
  code.startsWith("owner:")
    ? `Owner: ${areaName(code.slice(6), policy)}`
    : (requirementLabels[code] ?? code);
const signalLabel = (code) => signalLabels[code] ?? code;

const failureDetails = {
  "unknown-type": (_detail, policy) =>
    `start the title with one of ${policy.types.map(code).join(", ")}, as in ${code("fix(react): keep the composer focused")}`,
  "refactor-changes-api": (detail) =>
    `a \`refactor\` must not change ${code(detail)}; retitle it or split the change`,
  "refactor-changes-exports": (detail) =>
    `a \`refactor\` must not change the exports map in ${code(detail)}`,
  "refactor-changes-assertions": (detail) =>
    `a \`refactor\` must not change test assertions in ${code(detail)}`,
  "manifest-invalid": (detail) => `${code(detail)} is not valid JSON`,
};

function windowEnd(tier, context, policy) {
  const readyAt = Date.parse(context?.readyForReviewAt);
  if (Number.isNaN(readyAt)) return null;
  return new Date(readyAt + policy.windowHours[tier] * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

function requirementDetail(item, tier, context, policy, waivers) {
  const failure = failureDetails[item.code];
  let detail = failure ? failure(item.detail, policy) : cell(item.detail);
  if (item.code === "window") {
    const until = windowEnd(tier, context, policy);
    if (until !== null) {
      const hours = policy.windowHours[tier];
      detail = `${hours} hours after ready for review, until ${until} UTC`;
    }
  }
  const waiver = waivers.get(item.code);
  return waiver
    ? `${detail}; an owner can waive it with ${code(`${policy.labels.overridePrefix}${waiver}`)}`
    : detail;
}

export function statusLine({ tierResult, requirementResult, context }, policy) {
  const { tier } = tierResult;
  const { unmet } = requirementResult;
  if (unmet.length === 0) return `T${tier} · review requirements met`;

  const changes = [
    ...new Set(
      unmet
        .filter(({ code }) => !isWaiting(code))
        .map(({ code }) => requirementLabel(code, policy))
        .map((label) => label[0].toLowerCase() + label.slice(1)),
    ),
  ];
  if (changes.length) return `T${tier} · needs a change: ${changes.join(", ")}`;

  const waiting = unmet.map(({ code, maintainer }) => {
    if (code === "approvals")
      return maintainer ? "1 maintainer approval" : "1 approval";
    if (code.startsWith("owner:"))
      return `${areaName(code.slice(6), policy)} owner approval`;
    if (code === "decision") return "an accepted decision";
    const until = windowEnd(tier, context, policy);
    return until === null
      ? `the ${policy.windowHours[tier]}-hour window`
      : `the window until ${until} UTC`;
  });
  const list =
    waiting.length === 1
      ? waiting[0]
      : `${waiting.slice(0, -1).join(", ")} and ${waiting.at(-1)}`;
  return `T${tier} · waiting on ${list}`;
}

export function renderComment(evaluation, policy) {
  const { tierResult, requirementResult, advice, context } = evaluation;
  const { tier } = tierResult;
  const reasons = tierResult.reasons.toSorted((a, b) => b.tier - a.tier);
  const { unmet, waived, approvals } = requirementResult;
  const rules = `[CONTRIBUTING.md](https://github.com/${policy.repository}/blob/main/CONTRIBUTING.md#review-policy)`;
  const [top] = reasons;
  const out = [
    marker,
    `### review-tier: ${statusLine(evaluation, policy)}`,
    "",
    policy.reviewTierCheck.mode === "enforce"
      ? `_Required to merge. Rules in ${rules}._`
      : `_Shadow mode: advice only, this check never blocks a merge. Rules in ${rules}._`,
    "",
    `- **T${tier}, ${tierNames[tier]} tier:** ${top ? `${signalLabel(top.code)} ${code(top.detail)}${reasons.length > 1 ? `, and ${plural(reasons.length - 1, "more signal")}` : ""}` : "no risk signals"}`,
    `- **Approvals:** ${approvals.counted.length ? `${approvals.counted.join(", ")} counted` : unmet.some((item) => item.code === "approvals" || item.code.startsWith("owner:")) ? "none counted yet" : "none needed"}${approvals.ignored.length ? ` · ${approvals.ignored.map(({ login, reason }) => `${login} ignored (${ignoredLabels[reason] ?? reason})`).join(", ")}` : ""}`,
    ...waived.map(
      ({ code, signal, by }) =>
        `- **Waived:** ${requirementLabel(code, policy)}, by ${by} with \`${policy.labels.overridePrefix}${signal}\``,
    ),
  ];
  if (unmet.length) {
    out.push(
      "",
      mdTable(
        ["Still needed", "Detail"],
        ["---", "---"],
        unmet.map((item) => [
          `${isWaiting(item.code) ? "⏳" : "❌"} ${requirementLabel(item.code, policy)}`,
          requirementDetail(
            item,
            tier,
            context,
            policy,
            new Map([
              ...tierResult.failures
                .filter((failure) => failure.override !== null)
                .map((failure) => [failure.code, failure.override]),
              ...(policy.labels.overrideSignals.includes("window")
                ? [["window", "window"]]
                : []),
            ]),
          ),
        ]),
      ),
    );
  }
  if (advice.length) {
    out.push(
      "",
      "**Worth a look** (never blocks a merge):",
      "",
      ...advice.map((line) => `- ${line}`),
    );
  }
  const signals = [];
  if (reasons.length) {
    const shown = reasons.slice(0, 25);
    signals.push(
      "",
      "<details>",
      `<summary>${plural(reasons.length, "signal")} behind the tier</summary>`,
      "",
      mdTable(
        ["Signal", "Tier", "Where"],
        ["---", "---:", "---"],
        shown.map((reason) => [
          signalLabel(reason.code),
          `T${reason.tier}`,
          code(reason.detail),
        ]),
      ),
      ...(reasons.length > shown.length
        ? ["", `_${reasons.length - shown.length} more signals omitted._`]
        : []),
      "",
      "</details>",
    );
  }
  const footer = [
    context?.headSha ? `Evaluated on \`${context.headSha.slice(0, 7)}\`` : null,
    unmet.some((item) => isWaiting(item.code))
      ? "⏳ Waits on reviewers or time"
      : null,
    unmet.some((item) => !isWaiting(item.code)) ? "❌ Needs a change" : null,
  ].filter(Boolean);
  const render = (section) =>
    [
      ...out,
      ...section,
      ...(footer.length ? ["", footer.join(" · ")] : []),
    ].join("\n");
  const full = render(signals);
  return full.length <= 60_000
    ? full
    : render([
        "",
        `_${plural(reasons.length, "signal")} behind the tier, too long to list here._`,
      ]);
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
    mergeGroup = false,
  },
) {
  const repo = `/repos/${policy.repository}`;
  const body = renderComment(evaluation, policy);
  const { tier } = evaluation.tierResult;
  const ready = evaluation.conclusion === "success";
  const targetSha = checkSha ?? headSha;
  const inProgress =
    policy.reviewTierCheck.mode === "enforce" &&
    evaluation.conclusion === "action_required" &&
    !mergeGroup;
  const check = {
    name: policy.reviewTierCheck.name,
    external_id: startedAt,
    status: inProgress ? "in_progress" : "completed",
    ...(inProgress
      ? {}
      : {
          conclusion:
            policy.reviewTierCheck.mode === "shadow" && !ready
              ? "neutral"
              : evaluation.conclusion,
        }),
    output: {
      title: statusLine(evaluation, policy),
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
  if (
    Date.parse(latest?.external_id || latest?.started_at) >
    Date.parse(startedAt)
  )
    return;
  const open = latest?.status === "in_progress";
  const refresh =
    inProgress &&
    open &&
    Date.parse(startedAt) - Date.parse(latest.started_at) >
      7 * 24 * 60 * 60 * 1000;
  if (
    refresh ||
    latest?.status !== check.status ||
    (latest?.conclusion ?? null) !== (check.conclusion ?? null) ||
    latest.output?.title !== check.output.title ||
    latest.output?.summary !== check.output.summary
  ) {
    const run = {
      ...check,
      ...(inProgress ? {} : { completed_at: new Date().toISOString() }),
    };
    // Updating an open run in place keeps one incomplete run per head; a run open for 7 days is closed as action_required, never passing, and replaced before GitHub marks it stale at 14.
    if (open && !refresh) {
      await client.rest("PATCH", `${repo}/check-runs/${latest.id}`, run);
    } else {
      if (refresh) {
        await client.rest("PATCH", `${repo}/check-runs/${latest.id}`, {
          status: "completed",
          conclusion: "action_required",
          completed_at: new Date().toISOString(),
        });
      }
      await client.rest("POST", `${repo}/check-runs`, {
        ...run,
        head_sha: targetSha,
        started_at: startedAt,
      });
    }
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
        if (event.schedule !== dailySweepCron)
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
      let gatheredAt = now ?? new Date();
      for (let attempt = 0; attempt < 3; attempt++) {
        const gathered = await gatherPullRequest(client, policy, number, {
          now: gatheredAt,
          people,
        });
        if (gathered.pr.isDraft && !mergeGroup) break;
        const evaluation = evaluatePullRequest(gathered, policy);
        if (hasOption(args, "--dry-run")) {
          console.log(JSON.stringify(evaluation, null, 2));
          break;
        }
        if (attempt < 2) {
          const [owner, name] = policy.repository.split("/");
          const current = (
            await client.graphql(pullRequestStateQuery, { owner, name, number })
          ).repository.pullRequest;
          if (
            current?.headRefOid !== gathered.pr.headSha ||
            (!mergeGroup && current?.updatedAt !== gathered.pr.updatedAt)
          ) {
            gatheredAt = new Date(
              Math.max(Date.now(), Date.parse(gathered.startedAt) + 1),
            );
            continue;
          }
        }
        await publish(client, policy, {
          number,
          headSha: gathered.pr.headSha,
          checkSha,
          evaluation,
          startedAt: gathered.startedAt,
          labelsAndComment: !mergeGroup,
          mergeGroup,
        });
        break;
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
