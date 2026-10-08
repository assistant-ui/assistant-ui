import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { loadReviewPolicy, tierLabel } from "./lib/review-policy.mjs";
import {
  createGitHubClient,
  evaluatePullRequest,
  gatherPullRequest,
  main,
  publish,
  renderComment,
} from "./review-tier.mjs";

const policy = loadReviewPolicy(path.resolve(import.meta.dirname, ".."));
const enforcePolicy = {
  ...policy,
  reviewTierCheck: {
    ...policy.reviewTierCheck,
    integrationId: 42,
    mode: "enforce",
  },
};
const shadowPolicy = {
  ...policy,
  reviewTierCheck: {
    ...policy.reviewTierCheck,
    integrationId: null,
    mode: "shadow",
  },
};
const repo = `/repos/${policy.repository}`;
const now = new Date("2026-10-08T12:00:00Z");
const marker = "<!-- review-tier -->";
const apiError = (status) =>
  Object.assign(new Error(`Recorded HTTP ${status}`), { status });
const user = (login, __typename = "User") => ({ login, __typename });
const labelEvent = (name, login, createdAt = "2026-10-08T10:00:00Z") => ({
  __typename: "LabeledEvent",
  label: { name },
  actor: login === null ? null : { login },
  createdAt,
});
const readyEvent = (createdAt) => ({
  __typename: "ReadyForReviewEvent",
  createdAt,
});
const review = (login, overrides = {}) => ({
  author: user(login),
  state: "APPROVED",
  submittedAt: "2026-10-08T11:00:00Z",
  commit: { oid: "head" },
  ...overrides,
});
const commit = (oid, author, committer = author) => ({
  commit: {
    oid,
    author: { user: author ? { login: author } : null },
    committer: { user: committer ? { login: committer } : null },
  },
});
const file = (filename, overrides = {}) => ({
  filename,
  status: "modified",
  additions: 10,
  deletions: 5,
  patch: "@@ -1 +1 @@\n-old\n+new",
  ...overrides,
});

function tapPullRequest(overrides = {}) {
  return {
    title: "fix(tap): a flush owns its queued tasks and notifications",
    body: "## Summary\nOwn queued work per flush.\n\n## Decision\nNone.\n",
    isDraft: false,
    state: "MERGED",
    author: user("samdickson22"),
    headRefOid: "head",
    baseRefOid: "base-tip",
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-08T11:30:00Z",
    labels: { nodes: [{ name: "behavior-change" }] },
    timelineItems: {
      nodes: [
        labelEvent("behavior-change", "okisdev"),
        readyEvent("2026-10-08T08:00:00Z"),
        readyEvent("2026-10-01T09:00:00Z"),
      ],
    },
    reviews: { nodes: [review("Kinfe123")] },
    commits: { nodes: [commit("head", "samdickson22")] },
    closingIssuesReferences: { nodes: [] },
    ...overrides,
  };
}

function docsPullRequest(overrides = {}) {
  return tapPullRequest({
    title: "docs: clarify installation",
    body: "Clarify installation.",
    state: "OPEN",
    author: user("Kinfe123"),
    labels: { nodes: [] },
    timelineItems: { nodes: [] },
    reviews: { nodes: [] },
    commits: { nodes: [commit("head", "Kinfe123")] },
    ...overrides,
  });
}

function fakeClient({
  pr = tapPullRequest(),
  files = [
    file("packages/tap/src/core/scheduler.ts"),
    file("packages/tap/src/core/scheduler.test.ts"),
    file("apps/docs/content/docs/tap/scheduler.mdx"),
  ],
  admins = ["okisdev", "Yonom"],
  teams = {
    [policy.teams.maintainers]: ["okisdev", "Yonom", "Kinfe123", "bnb"],
    [policy.teams.reviewers]: [],
    owners: ["okisdev", "Yonom"],
  },
  adminStatus,
  missingTeam = policy.teams.reviewers,
  teamStatus = 404,
  permission = "write",
  permissionStatus,
  openCount = 1,
  issues = {},
  issueErrors = {},
  contents = {},
  labels = [{ name: "behavior-change" }],
  comments = [],
  checkRuns = [],
  pages = [{ nodes: [], pageInfo: { hasNextPage: false, endCursor: null } }],
  authorPages = [
    { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
  ],
  reviewPages,
  commitPages,
  failures = [],
  prByNumber = {},
  latestPrByNumber = {},
  prSnapshots,
  stateSnapshots,
} = {}) {
  const calls = [];
  const writes = [];
  const currentLabels = new Map([[12, structuredClone(labels)]]);
  const currentComments = new Map([[12, structuredClone(comments)]]);
  let nextCommentId = Math.max(90, ...comments.map(({ id }) => id ?? 0)) + 1;
  let currentCheckRuns = structuredClone(checkRuns);
  let gatherRead = 0;
  let stateRead = 0;
  const historyPage = (history, after) => {
    const index = history.findIndex(
      (page) => page.pageInfo.endCursor === after,
    );
    assert.ok(index >= 0 && history[index + 1], `Unrecorded page ${after}`);
    return structuredClone(history[index + 1]);
  };
  const client = {
    async graphql(query, variables) {
      calls.push({ kind: "graphql", query, variables });
      if (query.includes("query ReviewTierPullRequest(")) {
        if (failures.includes(variables.number)) throw apiError(500);
        const pullRequest = structuredClone(
          prByNumber[variables.number] ?? prSnapshots?.[gatherRead++] ?? pr,
        );
        const events = pullRequest.timelineItems.nodes;
        pullRequest.labeledEvents ??= {
          nodes: events
            .filter((event) => event.__typename === "LabeledEvent")
            .slice(-100),
        };
        pullRequest.readyEvents ??= {
          nodes: events
            .filter((event) => event.__typename === "ReadyForReviewEvent")
            .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
            .slice(-1),
        };
        if (reviewPages) pullRequest.reviews = structuredClone(reviewPages[0]);
        if (commitPages) pullRequest.commits = structuredClone(commitPages[0]);
        return { repository: { pullRequest } };
      }
      if (query.includes("query ReviewTierPullRequestState(")) {
        const latest =
          stateSnapshots?.[stateRead++] ??
          latestPrByNumber[variables.number] ??
          prByNumber[variables.number] ??
          pr;
        return {
          repository: {
            pullRequest: {
              updatedAt: latest.updatedAt,
              headRefOid: latest.headRefOid,
            },
          },
        };
      }
      if (query.includes("query ReviewTierReviews(")) {
        assert.ok(reviewPages);
        return {
          repository: {
            pullRequest: { reviews: historyPage(reviewPages, variables.after) },
          },
        };
      }
      if (query.includes("query ReviewTierCommits(")) {
        assert.ok(commitPages);
        return {
          repository: {
            pullRequest: { commits: historyPage(commitPages, variables.after) },
          },
        };
      }
      if (query.includes("query ReviewTierDecision(")) {
        if (Object.hasOwn(issueErrors, variables.number))
          throw issueErrors[variables.number];
        assert.ok(
          Object.hasOwn(issues, variables.number),
          `Unrecorded decision issue ${variables.number}`,
        );
        return {
          repository: { issue: structuredClone(issues[variables.number]) },
        };
      }
      if (query.includes("query ReviewTierAuthorCount(")) {
        assert.equal(
          variables.query,
          `repo:${policy.repository} is:pr is:open draft:false author:${pr.author.login}`,
        );
        return { search: { issueCount: openCount } };
      }
      if (query.includes("query ReviewTierAuthorPullRequests(")) {
        assert.equal(
          variables.query,
          `repo:${policy.repository} is:pr is:open draft:false author:${pr.author.login}`,
        );
        const index =
          variables.after === null
            ? 0
            : authorPages.findIndex(
                (page) => page.pageInfo.endCursor === variables.after,
              ) + 1;
        assert.ok(authorPages[index], `Unrecorded page ${variables.after}`);
        return { search: structuredClone(authorPages[index]) };
      }
      if (query.includes("query ReviewTierOpenPullRequests(")) {
        const index =
          variables.after === null
            ? 0
            : pages.findIndex(
                (page) => page.pageInfo.endCursor === variables.after,
              ) + 1;
        assert.ok(pages[index], `Unrecorded page ${variables.after}`);
        return { repository: { pullRequests: structuredClone(pages[index]) } };
      }
      assert.fail(`Unrecorded GraphQL query: ${query}`);
    },
    async paginate(resource) {
      calls.push({ kind: "paginate", resource });
      if (new RegExp(`^${repo}/pulls/\\d+/files$`).test(resource))
        return structuredClone(files);
      if (resource === "/orgs/assistant-ui/members?role=admin") {
        if (adminStatus) throw apiError(adminStatus);
        return admins.map((login) => ({ login }));
      }
      const team = /^\/orgs\/assistant-ui\/teams\/([^/]+)\/members$/.exec(
        resource,
      )?.[1];
      if (team) {
        if (team === missingTeam) throw apiError(teamStatus);
        assert.ok(Object.hasOwn(teams, team), `Unrecorded team ${team}`);
        return teams[team].map((login) => ({ login }));
      }
      const issue = new RegExp(
        `^${repo}/issues/(\\d+)/(labels|comments)$`,
      ).exec(resource);
      if (issue)
        return structuredClone(
          (issue[2] === "labels" ? currentLabels : currentComments).get(
            Number(issue[1]),
          ) ?? [],
        );
      assert.fail(`Unrecorded pagination: ${resource}`);
    },
    async rest(method, resource, body) {
      calls.push({ kind: "rest", method, resource, body });
      if (method === "GET") {
        const checkRunsPath = `/check-runs?check_name=${encodeURIComponent(policy.reviewTierCheck.name)}&filter=latest`;
        if (
          resource.startsWith(`${repo}/commits/`) &&
          resource.endsWith(checkRunsPath)
        ) {
          const sha = resource.slice(
            `${repo}/commits/`.length,
            -checkRunsPath.length,
          );
          return {
            data: {
              check_runs: structuredClone(
                currentCheckRuns.filter(
                  (run) => run.head_sha === undefined || run.head_sha === sha,
                ),
              ),
            },
            status: 200,
          };
        }
        if (resource.startsWith(`${repo}/compare/base-tip...`))
          return {
            data: { merge_base_commit: { sha: "merge-base" } },
            status: 200,
          };
        if (
          resource === `${repo}/collaborators/${pr.author?.login}/permission`
        ) {
          if (permissionStatus) throw apiError(permissionStatus);
          return { data: { permission }, status: 200 };
        }
        assert.fail(`Unrecorded GET: ${resource}`);
      }
      writes.push({ method, resource, body });
      if (resource === `${repo}/check-runs` && method === "POST") {
        currentCheckRuns.unshift({ ...structuredClone(body), app: { id: 42 } });
        return { status: 201, data: { id: 1 } };
      }
      if (method === "POST" && resource.endsWith("/labels")) {
        const number = Number(resource.split("/issues/")[1].split("/")[0]);
        currentLabels.set(number, [
          ...(currentLabels.get(number) ?? []),
          ...body.labels.map((name) => ({ name })),
        ]);
      } else if (method === "DELETE" && resource.includes("/labels/")) {
        const number = Number(resource.split("/issues/")[1].split("/")[0]);
        const name = decodeURIComponent(resource.split("/labels/")[1]);
        currentLabels.set(
          number,
          (currentLabels.get(number) ?? []).filter(
            (label) => label.name !== name,
          ),
        );
      } else if (method === "POST" && resource.endsWith("/comments")) {
        const number = Number(resource.split("/issues/")[1].split("/")[0]);
        currentComments.set(number, [
          ...(currentComments.get(number) ?? []),
          {
            id: nextCommentId++,
            body: body.body,
            user: { type: "Bot" },
          },
        ]);
      } else if (method === "PATCH" && resource.includes("/issues/comments/")) {
        const id = Number(resource.split("/").at(-1));
        let found = false;
        for (const comments of currentComments.values()) {
          const comment = comments.find((item) => item.id === id);
          if (comment) {
            comment.body = body.body;
            found = true;
            break;
          }
        }
        assert.ok(found, `Unrecorded comment ${id}`);
      } else {
        assert.fail(`Unrecorded write: ${method} ${resource}`);
      }
      return { status: 200, data: null };
    },
    async raw(resource) {
      calls.push({ kind: "raw", resource });
      assert.ok(
        Object.hasOwn(contents, resource),
        `Unrecorded content: ${resource}`,
      );
      return contents[resource];
    },
  };
  return { client, calls, writes };
}

async function evaluationFor(recording = fakeClient()) {
  return evaluatePullRequest(
    await gatherPullRequest(recording.client, policy, 12, { now }),
    policy,
  );
}

function eventOptions(client, name, event = {}, overrides = {}) {
  return {
    client,
    policy: enforcePolicy,
    now,
    args: [],
    env: {
      GITHUB_EVENT_NAME: name,
      GITHUB_EVENT_PATH: "event.json",
    },
    readFile: (file, encoding) => {
      assert.equal(file, "event.json");
      assert.equal(encoding, "utf8");
      return JSON.stringify(event);
    },
    ...overrides,
  };
}

function connectionPages(nodes) {
  const chunks = [];
  for (let index = 0; index < nodes.length; index += 100) {
    chunks.push({
      nodes: nodes.slice(index, index + 100),
      pageInfo: {
        hasNextPage: index + 100 < nodes.length,
        endCursor: String(index + 100),
      },
    });
  }
  return chunks;
}

test("the GitHub client sends authenticated JSON, follows Link pages, and accepts empty responses", async () => {
  const calls = [];
  const responses = [
    new Response(JSON.stringify([{ id: 1 }]), {
      headers: {
        link: '<https://api.test/items?page=2>; rel="next", <https://api.test/items?page=2>; rel="last"',
      },
    }),
    new Response(JSON.stringify([{ id: 2 }]), {
      headers: { link: '<https://api.test/items>; rel="prev"' },
    }),
    new Response(null, { status: 204 }),
    new Response(JSON.stringify({ id: 3 }), {
      status: 201,
      headers: { "x-test": "present" },
    }),
  ];
  const client = createGitHubClient({
    token: "test-token",
    apiRoot: "https://api.test/",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });
  assert.deepEqual(await client.paginate("/items"), [{ id: 1 }, { id: 2 }]);
  assert.equal((await client.rest("DELETE", "/item/1")).data, null);
  const response = await client.rest("POST", "/items", { name: "new" });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-test"), "present");
  assert.deepEqual(response.data, { id: 3 });
  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      "https://api.test/items",
      "https://api.test/items?page=2",
      "https://api.test/item/1",
      "https://api.test/items",
    ],
  );
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-token");
  assert.equal(calls[0].options.headers.Accept, "application/vnd.github+json");
  assert.equal(calls[0].options.headers["X-GitHub-Api-Version"], "2022-11-28");
  assert.equal(calls[3].options.headers["Content-Type"], "application/json");
  assert.equal(calls[3].options.body, JSON.stringify({ name: "new" }));
});

test("the GitHub client returns raw text, handles only raw 404 as missing, and unwraps GraphQL", async () => {
  const calls = [];
  const responses = [
    new Response("export const value = 1;"),
    new Response("", { status: 404 }),
    new Response("Denied", { status: 403 }),
    new Response(JSON.stringify({ data: { repository: { name: "example" } } })),
    new Response(
      JSON.stringify({
        errors: [
          { message: "First error", type: "NOT_FOUND" },
          { message: "Second error", type: "FORBIDDEN" },
        ],
      }),
    ),
  ];
  const client = createGitHubClient({
    token: "token",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });
  assert.equal(await client.raw("/contents/source"), "export const value = 1;");
  assert.equal(calls[0].options.headers.Accept, "application/vnd.github.raw");
  assert.equal(await client.raw("/contents/missing"), null);
  await assert.rejects(client.raw("/contents/denied"), { status: 403 });
  assert.deepEqual(await client.graphql("query Example", { n: 12 }), {
    repository: { name: "example" },
  });
  assert.equal(calls[3].url, "https://api.github.com/graphql");
  assert.deepEqual(JSON.parse(calls[3].options.body), {
    query: "query Example",
    variables: { n: 12 },
  });
  await assert.rejects(client.graphql("query Broken", {}), {
    status: 200,
    message: "First error; Second error",
    types: ["NOT_FOUND", "FORBIDDEN"],
  });
});

test("HTTP, transport, and invalid JSON failures carry a status", async () => {
  const client = createGitHubClient({
    token: "token",
    fetch: async () => new Response("Missing", { status: 404 }),
  });
  await assert.rejects(client.rest("GET", "/missing"), { status: 404 });
  const offline = createGitHubClient({
    token: "token",
    fetch: async () => {
      throw new Error("Offline");
    },
  });
  await assert.rejects(offline.rest("GET", "/items"), {
    status: 0,
    message: "Offline",
  });
  const invalid = createGitHubClient({
    token: "token",
    fetch: async () => new Response("not json"),
  });
  await assert.rejects(invalid.rest("GET", "/items"), { status: 200 });
});

test("the merged tap fixture is T3 with approvals, owner, decision, and window still needed", async () => {
  const { client, calls } = fakeClient();
  const gathered = await gatherPullRequest(client, policy, 12, { now });
  assert.deepEqual(gathered.pr, {
    number: 12,
    title: "fix(tap): a flush owns its queued tasks and notifications",
    author: "samdickson22",
    isDraft: false,
    state: "MERGED",
    headSha: "head",
    updatedAt: "2026-10-08T11:30:00Z",
  });
  assert.match(
    calls.find(({ query }) => query?.includes("query ReviewTierPullRequest("))
      .query,
    /createdAt updatedAt/,
  );
  assert.deepEqual(gathered.people.labels, [
    { name: "behavior-change", addedBy: "okisdev" },
  ]);
  assert.equal(gathered.people.authorHasWriteAccess, true);
  assert.equal(gathered.people.now, now.toISOString());
  assert.equal(gathered.people.readyForReviewAt, "2026-10-08T08:00:00Z");
  assert.equal(gathered.people.openPullRequestCount, 1);
  assert.deepEqual(gathered.people.commits, [
    { sha: "head", author: "samdickson22", committer: "samdickson22" },
  ]);
  assert.deepEqual(gathered.people.admins, ["okisdev", "Yonom"]);
  assert.deepEqual(gathered.people.teams, {
    [policy.teams.maintainers]: ["okisdev", "Yonom", "Kinfe123", "bnb"],
    [policy.teams.reviewers]: [],
    owners: ["okisdev", "Yonom"],
  });
  assert.ok(!Object.hasOwn(gathered.people, "maintainers"));
  const before = structuredClone(gathered);
  const evaluation = evaluatePullRequest(gathered, policy);
  assert.deepEqual(gathered, before);
  assert.equal(evaluation.tierResult.tier, 3);
  assert.equal(evaluation.conclusion, "action_required");
  assert.deepEqual(
    evaluation.requirementResult.unmet.map(({ code }) => code),
    ["approvals", "owner:reactivity", "decision", "window"],
  );
  assert.deepEqual(evaluation.requirementResult.approvals, {
    counted: ["Kinfe123"],
    ignored: [],
  });
  assert.equal(
    calls.filter((call) => call.query?.includes("query ReviewTierPullRequest("))
      .length,
    1,
  );
  assert.ok(
    calls.some((call) => call.resource === `${repo}/compare/base-tip...head`),
  );
  assert.deepEqual(
    calls
      .filter(
        (call) =>
          call.kind === "paginate" && call.resource.startsWith("/orgs/"),
      )
      .map(({ resource }) => resource),
    [
      "/orgs/assistant-ui/members?role=admin",
      `/orgs/assistant-ui/teams/${policy.teams.maintainers}/members`,
      `/orgs/assistant-ui/teams/${policy.teams.reviewers}/members`,
      "/orgs/assistant-ui/teams/owners/members",
    ],
  );
});

test("gathering includes a later requested change after the same reviewer's approval", async () => {
  const reviews = [
    review("Kinfe123"),
    ...Array.from({ length: 99 }, (_, index) => review(`reviewer-${index}`)),
    review("Kinfe123", {
      state: "CHANGES_REQUESTED",
      submittedAt: "2026-10-08T11:30:00Z",
    }),
  ];
  const recording = fakeClient({ reviewPages: connectionPages(reviews) });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.equal(gathered.people.reviews.length, 101);
  assert.deepEqual(
    gathered.people.reviews
      .filter(({ author }) => author === "Kinfe123")
      .map(({ state }) => state),
    ["APPROVED", "CHANGES_REQUESTED"],
  );
  assert.deepEqual(
    recording.calls
      .filter(({ query }) => query?.includes("query ReviewTierReviews("))
      .map(({ variables }) => variables.after),
    ["100"],
  );
});

test("gathering reads every commit from oldest to newest across three pages", async () => {
  const commits = Array.from({ length: 205 }, (_, index) =>
    commit(`sha-${index}`, `author-${index}`),
  );
  const recording = fakeClient({ commitPages: connectionPages(commits) });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.deepEqual(
    gathered.people.commits.map(({ sha }) => sha),
    commits.map(({ commit }) => commit.oid),
  );
  assert.deepEqual(
    recording.calls
      .filter(({ query }) => query?.includes("query ReviewTierCommits("))
      .map(({ variables }) => variables.after),
    ["100", "200"],
  );
});

test("ready time survives one hundred later label events", async () => {
  const readyAt = "2026-10-02T09:00:00Z";
  const recording = fakeClient({
    pr: tapPullRequest({
      timelineItems: {
        nodes: [
          readyEvent(readyAt),
          ...Array.from({ length: 100 }, (_, index) =>
            labelEvent(`label-${index}`, "okisdev", "2026-10-03T09:00:00Z"),
          ),
        ],
      },
    }),
  });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.equal(gathered.people.readyForReviewAt, readyAt);
  const query = recording.calls.find(({ query }) =>
    query?.includes("query ReviewTierPullRequest("),
  ).query;
  assert.match(
    query,
    /readyEvents: timelineItems\(itemTypes: \[READY_FOR_REVIEW_EVENT\], last: 1\)/,
  );
  assert.match(
    query,
    /labeledEvents: timelineItems\(itemTypes: \[LABELED_EVENT\], last: 100\)/,
  );
});

for (const body of [
  "## Decision\n<!-- for example\n#1234 -->\nNone.\n",
  "## Decision\n<!<!-- x -->-- #77 -->\nNone.\n",
  "## Decision\nNone.\n<!-- #55",
]) {
  test(`Decision references inside HTML comments are ignored: ${JSON.stringify(body)}`, async () => {
    const recording = fakeClient({ pr: tapPullRequest({ body }) });
    const gathered = await gatherPullRequest(recording.client, policy, 12, {
      now,
    });
    assert.deepEqual(gathered.people.linkedIssues, []);
    assert.equal(
      recording.calls.filter(({ query }) =>
        query?.includes("query ReviewTierDecision("),
      ).length,
      0,
    );
  });
}

test("unresolved Decision issue numbers are skipped while closing issues still resolve", async () => {
  const missing = Object.assign(new Error("Could not resolve to an Issue"), {
    types: ["NOT_FOUND"],
  });
  const recording = fakeClient({
    pr: tapPullRequest({
      body: "## Decision\nSee #9002.\n",
      closingIssuesReferences: { nodes: [{ number: 42 }] },
    }),
    issues: { 42: { labels: { nodes: [] }, timelineItems: { nodes: [] } } },
    issueErrors: { 9002: missing },
  });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.deepEqual(gathered.people.linkedIssues, [{ number: 42, labels: [] }]);
  assert.deepEqual(
    recording.calls
      .filter(({ query }) => query?.includes("query ReviewTierDecision("))
      .map(({ variables }) => variables.number),
    [42, 9002],
  );
  const forbidden = Object.assign(new Error("Forbidden"), {
    types: ["NOT_FOUND", "FORBIDDEN"],
  });
  await assert.rejects(
    gatherPullRequest(
      fakeClient({
        pr: tapPullRequest({ body: "## Decision\nSee #9002.\n" }),
        issueErrors: { 9002: forbidden },
      }).client,
      policy,
      12,
      { now },
    ),
    forbidden,
  );
});

test("malformed head package manifest is recorded without an exports diff", async () => {
  const manifestPath = "packages/react/package.json";
  const recording = fakeClient({
    pr: docsPullRequest(),
    files: [file(manifestPath)],
    contents: {
      [`${repo}/contents/${manifestPath}?ref=merge-base`]:
        '{"exports":{".":"./index.js"}}',
      [`${repo}/contents/${manifestPath}?ref=head`]: '{"exports":',
    },
  });
  const { signalsInput } = await gatherPullRequest(
    recording.client,
    policy,
    12,
    { now },
  );
  assert.deepEqual(signalsInput.invalidManifests, [manifestPath]);
  assert.deepEqual(signalsInput.manifests, [
    { path: manifestPath, base: null, head: null },
  ]);
  assert.deepEqual(signalsInput.exportsDiffs, []);
});

test("a maintainer's T0 docs pull request succeeds without approvals", async () => {
  const recording = fakeClient({
    pr: docsPullRequest(),
    files: [file("README.md")],
  });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.equal(gathered.people.readyForReviewAt, "2026-10-01T08:00:00Z");
  const evaluation = evaluatePullRequest(gathered, policy);
  assert.equal(evaluation.tierResult.tier, 0);
  assert.equal(evaluation.conclusion, "success");
  assert.deepEqual(evaluation.requirementResult.unmet, []);
});

test("gathering fetches every distinct area owner team once", async () => {
  const expandedPolicy = {
    ...policy,
    areas: [
      ...policy.areas,
      { ...policy.areas[0], id: "release", ownerTeam: "release-owners" },
    ],
  };
  const recording = fakeClient({
    teams: {
      [policy.teams.maintainers]: ["okisdev", "Yonom", "Kinfe123", "bnb"],
      [policy.teams.reviewers]: [],
      owners: ["okisdev", "Yonom"],
      "release-owners": ["releaselead"],
    },
  });
  const gathered = await gatherPullRequest(
    recording.client,
    expandedPolicy,
    12,
    { now },
  );
  assert.deepEqual(gathered.people.teams["release-owners"], ["releaselead"]);
  assert.deepEqual(
    recording.calls
      .filter(
        ({ kind, resource }) =>
          kind === "paginate" && resource.includes("/teams/"),
      )
      .map(({ resource }) => resource),
    [
      `/orgs/assistant-ui/teams/${policy.teams.maintainers}/members`,
      `/orgs/assistant-ui/teams/${policy.teams.reviewers}/members`,
      "/orgs/assistant-ui/teams/owners/members",
      "/orgs/assistant-ui/teams/release-owners/members",
    ],
  );
});

test("decision references include closing issues and only the Decision section, deduplicated", async () => {
  const issue = (events) => ({
    labels: { nodes: [{ name: "decision: accepted" }] },
    timelineItems: { nodes: events },
  });
  const recording = fakeClient({
    pr: tapPullRequest({
      body: "## Summary\r\nMention #999.\r\n## Decision\r\nSee #42, #43 and #42.\r\n### Context\r\nAlso #44.\r\n## Tests\r\nIgnore #888.\r\n",
      closingIssuesReferences: { nodes: [{ number: 42 }] },
    }),
    issues: {
      42: issue([labelEvent("decision: accepted", "outsider")]),
      43: issue([
        labelEvent("decision: accepted", "Yonom", "2026-10-08T11:00:00Z"),
        labelEvent("decision: accepted", "outsider", "2026-10-08T10:00:00Z"),
      ]),
      44: issue([]),
    },
  });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.deepEqual(gathered.people.linkedIssues, [
    {
      number: 42,
      labels: [{ name: "decision: accepted", addedBy: "outsider" }],
    },
    {
      number: 43,
      labels: [{ name: "decision: accepted", addedBy: "Yonom" }],
    },
    { number: 44, labels: [{ name: "decision: accepted", addedBy: null }] },
  ]);
  assert.ok(
    !evaluatePullRequest(gathered, policy).requirementResult.unmet.some(
      ({ code }) => code === "decision",
    ),
  );
  assert.equal(
    recording.calls.filter((call) =>
      call.query?.includes("query ReviewTierDecision("),
    ).length,
    3,
  );
});

test("latest label actors, bot reviews, and missing commit identities reach requirements intact", async () => {
  const recording = fakeClient({
    pr: tapPullRequest({
      labels: {
        nodes: [
          { name: "behavior-change" },
          { name: "unknown" },
          { name: "review-tier/override: window" },
        ],
      },
      timelineItems: {
        nodes: [
          labelEvent("behavior-change", null),
          labelEvent(
            "review-tier/override: window",
            "okisdev",
            "2026-10-08T11:00:00Z",
          ),
          labelEvent(
            "review-tier/override: window",
            "outsider",
            "2026-10-08T09:00:00Z",
          ),
          readyEvent("2026-10-08T08:00:00Z"),
        ],
      },
      reviews: {
        nodes: [
          review("Kinfe123"),
          review("automation", { author: user("automation", "Bot") }),
        ],
      },
      commits: {
        nodes: [
          commit("old", null, null),
          commit("head", "samdickson22", "web-flow"),
        ],
      },
    }),
  });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.deepEqual(gathered.people.labels.slice(0, 2), [
    { name: "behavior-change", addedBy: null },
    { name: "unknown", addedBy: null },
  ]);
  assert.deepEqual(gathered.people.commits[0], {
    sha: "old",
    author: null,
    committer: null,
  });
  const result = evaluatePullRequest(gathered, policy).requirementResult;
  assert.deepEqual(result.waived, [
    { code: "window", signal: "window", by: "okisdev" },
  ]);
  assert.deepEqual(result.approvals.ignored, [
    { login: "automation", reason: "bot" },
  ]);
});

test("API surfaces and manifests are diffed at the merge base and head, including missing and renamed files", async () => {
  const surface = (type) =>
    `declare const value: ${type};\ndeclare namespace api { export { value }; }\nexport { api as entry_main };`;
  const baseManifest = { exports: { ".": "./old.js" }, dependencies: {} };
  const headManifest = {
    exports: { ".": "./new.js", "./extra": "./extra.js" },
    dependencies: { added: "^1.0.0" },
  };
  const contents = {};
  for (const [file, base, head] of [
    ["api-surface/react.ts", surface("string"), surface("number")],
    ["api-surface/old.ts", surface("string"), null],
    [
      "packages/react/package.json",
      JSON.stringify(baseManifest),
      JSON.stringify(headManifest),
    ],
    [
      "packages/new/package.json",
      null,
      JSON.stringify({ exports: "./index.js" }),
    ],
    [
      "packages/gone/package.json",
      JSON.stringify({ exports: "./index.js" }),
      null,
    ],
    [
      "packages/unchanged/package.json",
      JSON.stringify({ version: "1" }),
      JSON.stringify({ version: "2" }),
    ],
  ]) {
    contents[`${repo}/contents/${file}?ref=merge-base`] = base;
    contents[`${repo}/contents/${file}?ref=head`] = head;
  }
  const recording = fakeClient({
    pr: docsPullRequest(),
    files: [
      file("api-surface/react.ts", { status: "changed" }),
      file("archived/old.ts", {
        status: "renamed",
        previous_filename: "api-surface/old.ts",
      }),
      file("packages/react/package.json"),
      file("packages/new/package.json", { status: "added" }),
      file("packages/gone/package.json", { status: "removed" }),
      file("packages/unchanged/package.json"),
    ],
    contents,
  });
  const { signalsInput } = await gatherPullRequest(
    recording.client,
    policy,
    12,
    { now },
  );
  assert.deepEqual(
    signalsInput.files.map(({ status }) => status),
    ["modified", "renamed", "modified", "added", "removed", "modified"],
  );
  assert.equal(signalsInput.files[1].previousPath, "api-surface/old.ts");
  assert.equal(signalsInput.files[0].patch, "@@ -1 +1 @@\n-old\n+new");
  assert.deepEqual(signalsInput.apiSurface[0].diff.declarationsChanged, [
    { entry: "entry_main", name: "value" },
  ]);
  assert.deepEqual(signalsInput.apiSurface[1].diff.entriesRemoved, [
    "entry_main",
  ]);
  assert.deepEqual(signalsInput.manifests[0], {
    path: "packages/react/package.json",
    base: baseManifest,
    head: headManifest,
  });
  assert.deepEqual(signalsInput.invalidManifests, []);
  assert.equal(signalsInput.manifests[1].base, null);
  assert.equal(signalsInput.manifests[2].head, null);
  assert.deepEqual(signalsInput.exportsDiffs, [
    {
      path: "packages/react/package.json",
      diff: { added: ["./extra"], removed: [], changed: ["."] },
    },
    {
      path: "packages/new/package.json",
      diff: { added: ["."], removed: [], changed: [] },
    },
    {
      path: "packages/gone/package.json",
      diff: { added: [], removed: ["."], changed: [] },
    },
  ]);
  assert.equal(recording.calls.filter(({ kind }) => kind === "raw").length, 12);
});

test("a missing team is empty with a warning, while other team errors propagate", async (t) => {
  const warnings = t.mock.method(console, "warn", () => {});
  const missingReviewers = await gatherPullRequest(
    fakeClient().client,
    policy,
    12,
    { now },
  );
  assert.deepEqual(missingReviewers.people.teams[policy.teams.reviewers], []);
  assert.equal(warnings.mock.callCount(), 1);
  assert.match(warnings.mock.calls[0].arguments[0], /reviewers.*empty/);

  const missingMaintainers = await gatherPullRequest(
    fakeClient({ missingTeam: policy.teams.maintainers }).client,
    policy,
    12,
    { now },
  );
  assert.deepEqual(missingMaintainers.people.admins, ["okisdev", "Yonom"]);
  assert.deepEqual(
    missingMaintainers.people.teams[policy.teams.maintainers],
    [],
  );
  assert.equal(warnings.mock.callCount(), 2);
  assert.match(warnings.mock.calls[1].arguments[0], /maintainers.*empty/);

  const missingAreaOwners = await gatherPullRequest(
    fakeClient({ missingTeam: "owners" }).client,
    policy,
    12,
    { now },
  );
  assert.deepEqual(missingAreaOwners.people.teams.owners, []);
  assert.equal(warnings.mock.callCount(), 3);
  assert.match(warnings.mock.calls[2].arguments[0], /owners.*empty/);
  await assert.rejects(
    gatherPullRequest(
      fakeClient({ missingTeam: "owners", teamStatus: 403 }).client,
      policy,
      12,
      { now },
    ),
    { status: 403 },
  );
  const missingOwners = await gatherPullRequest(
    fakeClient({ adminStatus: 404 }).client,
    policy,
    12,
    { now },
  );
  assert.deepEqual(missingOwners.people.admins, []);
  assert.deepEqual(missingOwners.people.teams[policy.teams.maintainers], [
    "okisdev",
    "Yonom",
    "Kinfe123",
    "bnb",
  ]);
  assert.equal(warnings.mock.callCount(), 5);
  assert.match(warnings.mock.calls[3].arguments[0], /owners as empty/);
  assert.match(warnings.mock.calls[4].arguments[0], /reviewers.*empty/);
  await assert.rejects(
    gatherPullRequest(fakeClient({ adminStatus: 403 }).client, policy, 12, {
      now,
    }),
    { status: 403 },
  );
});

test("write permissions are limited to admin, maintain, and write, with 404 treated as false", async () => {
  for (const permission of ["admin", "maintain", "write", "triage", "read"]) {
    const gathered = await gatherPullRequest(
      fakeClient({ permission }).client,
      policy,
      12,
      { now },
    );
    assert.equal(
      gathered.people.authorHasWriteAccess,
      ["admin", "maintain", "write"].includes(permission),
    );
  }
  const gathered = await gatherPullRequest(
    fakeClient({ permissionStatus: 404 }).client,
    policy,
    12,
    { now },
  );
  assert.equal(gathered.people.authorHasWriteAccess, false);
  for (const permissionStatus of [403, 500]) {
    await assert.rejects(
      gatherPullRequest(fakeClient({ permissionStatus }).client, policy, 12, {
        now,
      }),
      { status: permissionStatus },
    );
  }
});

test("a deleted author has no permission lookup or author search", async () => {
  const recording = fakeClient({ pr: tapPullRequest({ author: null }) });
  const gathered = await gatherPullRequest(recording.client, policy, 12, {
    now,
  });
  assert.equal(gathered.people.author, null);
  assert.equal(gathered.people.authorHasWriteAccess, false);
  assert.equal(gathered.people.openPullRequestCount, 0);
  assert.ok(
    !recording.calls.some(
      (call) =>
        call.resource?.includes("/collaborators/") ||
        call.query?.includes("query ReviewTierAuthorCount("),
    ),
  );
});

test("hard policy failures stay failures", async () => {
  const evaluation = await evaluationFor(
    fakeClient({ openCount: policy.openPullRequestCap.withWriteAccess + 1 }),
  );
  assert.equal(evaluation.conclusion, "failure");
  assert.ok(
    evaluation.requirementResult.unmet.some(
      ({ code }) => code === "open-pr-cap",
    ),
  );
});

test("the comment starts with its marker and strongest reason and bounds the reasons list", async () => {
  const evaluation = await evaluationFor();
  evaluation.tierResult.reasons.push(
    ...Array.from({ length: 12 }, (_, index) => ({
      tier: 0,
      code: "low-risk-path",
      detail: `docs/${index}.md`,
    })),
  );
  evaluation.requirementResult.waived.push({
    code: "size-cap",
    signal: "size",
    by: "okisdev",
  });
  evaluation.requirementResult.approvals.ignored.push({
    login: "previous-reviewer",
    reason: "stale",
  });
  const before = structuredClone(evaluation);
  const comment = renderComment(evaluation, policy);
  assert.deepEqual(evaluation, before);
  assert.equal(comment.split("\n")[0], marker);
  assert.match(comment.split("\n")[1], /^T3.*behavior-change-label/);
  const reasons = comment
    .split("Reasons:\n\n")[1]
    .split("\n\nStill needed:")[0];
  assert.equal(
    reasons.split("\n").filter((line) => line.startsWith("- ")).length,
    10,
  );
  assert.match(reasons, /and 6 more$/);
  for (const expected of [
    "owner:reactivity",
    "decision:",
    "window:",
    "needs 2 maintainer approvals",
    "size-cap: waived by okisdev with review-tier/override: size",
    "Kinfe123: trusted approval on the current head from someone who did not author or commit any of its commits.",
    "previous-reviewer: stale",
  ]) {
    assert.ok(comment.includes(expected), expected);
  }
});

test("shadow mode changes pending and failure to neutral while success remains success", async () => {
  for (const [recording, conclusion, title] of [
    [fakeClient(), "neutral", /^T3: needs 2 maintainer approvals/],
    [
      fakeClient({ openCount: 6 }),
      "neutral",
      /^T3: needs 2 maintainer approvals/,
    ],
    [
      fakeClient({ pr: docsPullRequest(), files: [file("README.md")] }),
      "success",
      /^T0: ready$/,
    ],
  ]) {
    const evaluation = await evaluationFor(recording);
    const before = structuredClone(evaluation);
    await publish(recording.client, shadowPolicy, {
      number: 12,
      headSha: "head",
      evaluation,
      labelsAndComment: false,
    });
    assert.deepEqual(evaluation, before);
    assert.equal(recording.writes.length, 1);
    const { body } = recording.writes[0];
    assert.equal(body.conclusion, conclusion);
    assert.equal(body.head_sha, "head");
    assert.equal(body.name, "review-tier");
    assert.equal(body.status, "completed");
    assert.match(body.output.title, title);
    assert.equal(
      body.output.summary,
      renderComment(evaluation, policy).split("\n").slice(1).join("\n"),
    );
  }
});

test("publishing syncs tier labels and creates a sticky comment without repeating unchanged writes", async () => {
  const recording = fakeClient({
    labels: [
      { name: "tier/1" },
      { name: "tier/2" },
      { name: "behavior-change" },
      { name: "unrelated" },
    ],
    comments: [{ id: 2, body: "Regular comment" }],
  });
  const evaluation = await evaluationFor(recording);
  const options = { number: 12, headSha: "head", evaluation };
  await publish(recording.client, enforcePolicy, options);
  assert.deepEqual(
    recording.writes.map(({ method, resource }) => [method, resource]),
    [
      ["POST", `${repo}/check-runs`],
      ["POST", `${repo}/issues/12/labels`],
      ["DELETE", `${repo}/issues/12/labels/tier%2F1`],
      ["DELETE", `${repo}/issues/12/labels/tier%2F2`],
      ["POST", `${repo}/issues/12/comments`],
    ],
  );
  assert.equal(recording.writes[0].body.conclusion, "action_required");
  assert.deepEqual(recording.writes[1].body, { labels: ["tier/3"] });
  assert.deepEqual(recording.writes[4].body, {
    body: renderComment(evaluation, policy),
  });
  const writeCount = recording.writes.length;
  await publish(recording.client, enforcePolicy, options);
  assert.equal(recording.writes.length, writeCount);
});

test("an existing sticky comment is updated only when its body changes", async () => {
  const recording = fakeClient({
    labels: [{ name: "tier/3" }],
    comments: [
      { id: 81, body: `Leading text ${marker}` },
      { id: 82, body: `${marker}\nOld result`, user: { type: "Bot" } },
    ],
  });
  const evaluation = await evaluationFor(recording);
  const options = { number: 12, headSha: "head", evaluation };
  await publish(recording.client, enforcePolicy, options);
  await publish(recording.client, enforcePolicy, options);
  assert.deepEqual(
    recording.writes.filter(({ resource }) => resource.includes("comments")),
    [
      {
        method: "PATCH",
        resource: `${repo}/issues/comments/82`,
        body: { body: renderComment(evaluation, policy) },
      },
    ],
  );
});

test("a human marker comment is ignored when publishing the sticky bot comment", async () => {
  const recording = fakeClient({
    labels: [{ name: "tier/3" }],
    comments: [
      { id: 81, body: `${marker}\nHuman text`, user: { type: "User" } },
    ],
  });
  const evaluation = await evaluationFor(recording);
  await publish(recording.client, enforcePolicy, {
    number: 12,
    headSha: "head",
    evaluation,
  });
  assert.deepEqual(
    recording.writes.filter(({ resource }) => resource.includes("comments")),
    [
      {
        method: "POST",
        resource: `${repo}/issues/12/comments`,
        body: { body: renderComment(evaluation, enforcePolicy) },
      },
    ],
  );
});

test("identical checks from the pinned app still sync each pull request", async () => {
  const baseline = fakeClient();
  const evaluation = await evaluationFor(baseline);
  await publish(baseline.client, enforcePolicy, {
    number: 12,
    headSha: "head",
    evaluation,
    labelsAndComment: false,
  });
  const intended = baseline.writes[0].body;
  const pinnedPolicy = {
    ...enforcePolicy,
    reviewTierCheck: { ...enforcePolicy.reviewTierCheck, integrationId: 42 },
  };
  for (const [checkRuns, expectedWrites] of [
    [[{ ...intended, app: { id: 42 } }], 0],
    [
      [
        {
          ...intended,
          output: { ...intended.output, summary: "Old summary" },
          app: { id: 42 },
        },
      ],
      1,
    ],
    [[{ ...intended, app: { id: 99 } }], 1],
  ]) {
    const recording = fakeClient({
      checkRuns,
      labels: [{ name: "tier/3" }],
      comments: [
        {
          id: 81,
          body: renderComment(evaluation, pinnedPolicy),
          user: { type: "Bot" },
        },
      ],
    });
    await publish(recording.client, pinnedPolicy, {
      number: 12,
      headSha: "head",
      evaluation,
    });
    assert.equal(recording.writes.length, expectedWrites);
    assert.equal(
      recording.calls.filter(({ resource }) => resource?.includes("/issues/"))
        .length,
      2,
    );
    assert.ok(
      recording.calls.some(
        ({ method, resource }) =>
          method === "GET" &&
          resource ===
            `${repo}/commits/head/check-runs?check_name=review-tier&filter=latest`,
      ),
    );
  }
  const recording = fakeClient({
    checkRuns: [{ ...intended, app: { id: 42 } }],
    labels: [{ name: "tier/3" }],
    comments: [
      {
        id: 81,
        body: renderComment(evaluation, pinnedPolicy),
        user: { type: "Bot" },
      },
    ],
  });
  await publish(recording.client, pinnedPolicy, {
    number: 12,
    headSha: "head",
    evaluation,
  });
  await publish(recording.client, pinnedPolicy, {
    number: 13,
    headSha: "head",
    evaluation,
  });
  assert.deepEqual(
    recording.writes.map(({ method, resource }) => [method, resource]),
    [
      ["POST", `${repo}/issues/13/labels`],
      ["POST", `${repo}/issues/13/comments`],
    ],
  );
  assert.deepEqual(recording.writes[0].body, { labels: ["tier/3"] });
  assert.deepEqual(recording.writes[1].body, {
    body: renderComment(evaluation, pinnedPolicy),
  });
});

test("newer check runs block stale publishes while older runs allow them", async () => {
  const evaluation = await evaluationFor();
  for (const integrationId of [42, null]) {
    const recording = fakeClient({
      checkRuns: [
        {
          started_at: "2026-10-08T12:01:00Z",
          app: { id: integrationId === null ? 99 : 42 },
        },
      ],
    });
    const checkPolicy = {
      ...enforcePolicy,
      reviewTierCheck: { ...enforcePolicy.reviewTierCheck, integrationId },
    };
    await publish(recording.client, checkPolicy, {
      number: 12,
      headSha: "head",
      evaluation,
      startedAt: now.toISOString(),
    });
    assert.deepEqual(recording.writes, []);
    assert.ok(
      !recording.calls.some(({ resource }) => resource?.includes("/issues/")),
    );
  }
  const recording = fakeClient({
    checkRuns: [{ started_at: "2026-10-08T11:59:00Z", app: { id: 42 } }],
  });
  const beforePublish = Date.now();
  await publish(recording.client, enforcePolicy, {
    number: 12,
    headSha: "head",
    evaluation,
    startedAt: now.toISOString(),
  });
  const afterPublish = Date.now();
  const check = recording.writes.find(
    ({ method, resource }) =>
      method === "POST" && resource === `${repo}/check-runs`,
  ).body;
  assert.equal(check.started_at, now.toISOString());
  assert.ok(Date.parse(check.completed_at) >= beforePublish);
  assert.ok(Date.parse(check.completed_at) <= afterPublish);
  assert.ok(
    recording.writes.some(
      ({ resource }) => resource === `${repo}/issues/12/labels`,
    ),
  );
  assert.ok(
    recording.writes.some(
      ({ resource }) => resource === `${repo}/issues/12/comments`,
    ),
  );
});

test("merge groups parse branch refs, evaluate fresh data even for drafts, and publish only a check on the queue SHA", async () => {
  for (const base of ["main", "release/next"]) {
    const recording = fakeClient({ pr: tapPullRequest({ isDraft: true }) });
    const code = await main(
      eventOptions(recording.client, "merge_group", {
        merge_group: {
          head_ref: `refs/heads/gh-readonly-queue/${base}/pr-12-abcdef1234`,
          head_sha: "queue-sha",
        },
      }),
    );
    assert.equal(code, 0);
    assert.equal(recording.writes.length, 1);
    assert.equal(recording.writes[0].resource, `${repo}/check-runs`);
    assert.equal(recording.writes[0].body.head_sha, "queue-sha");
    assert.equal(recording.writes[0].body.conclusion, "action_required");
    assert.ok(
      recording.calls.some(
        (call) =>
          call.query?.includes("query ReviewTierPullRequest(") &&
          call.variables.number === 12,
      ),
    );
    assert.ok(
      !recording.calls.some((call) => call.resource?.includes("/issues/")),
    );
  }
  for (const head_ref of [
    "refs/heads/feature/pr-12-abcdef",
    "refs/heads/gh-readonly-queue/main/pr-nope-abcdef",
    "refs/heads/gh-readonly-queue/main/pr-12-abc/extra",
  ]) {
    const recording = fakeClient();
    await assert.rejects(
      main(
        eventOptions(recording.client, "merge_group", {
          merge_group: { head_ref, head_sha: "queue" },
        }),
      ),
      /Merge group ref/,
    );
    assert.deepEqual(recording.calls, []);
  }
});

test("merge groups ignore updatedAt changes when the pull request head is unchanged", async () => {
  const recording = fakeClient({
    latestPrByNumber: {
      12: { updatedAt: "2026-10-08T11:31:00Z", headRefOid: "head" },
    },
  });
  assert.equal(
    await main(
      eventOptions(recording.client, "merge_group", {
        merge_group: {
          head_ref: "refs/heads/gh-readonly-queue/main/pr-12-abcdef1234",
          head_sha: "queue-sha",
        },
      }),
    ),
    0,
  );
  assert.equal(
    recording.calls.filter(({ query }) =>
      query?.includes("query ReviewTierPullRequest("),
    ).length,
    1,
  );
  assert.equal(
    recording.calls.filter(({ query }) =>
      query?.includes("query ReviewTierPullRequestState("),
    ).length,
    1,
  );
  assert.deepEqual(
    recording.writes.map(({ resource }) => resource),
    [`${repo}/check-runs`],
  );
  assert.equal(recording.writes[0].body.head_sha, "queue-sha");
  assert.equal(recording.writes[0].body.started_at, now.toISOString());
  assert.ok(
    recording.calls.findIndex(({ query }) =>
      query?.includes("query ReviewTierPullRequestState("),
    ) <
      recording.calls.findIndex(
        ({ method, resource }) =>
          method === "POST" && resource === `${repo}/check-runs`,
      ),
  );
});

test("issues events reevaluate only open T3 pull requests and only for the decision label", async () => {
  for (const event of [{}, { label: { name: "bug" } }]) {
    const recording = fakeClient();
    assert.equal(
      await main(eventOptions(recording.client, "issues", event)),
      0,
    );
    assert.deepEqual(recording.calls, []);
  }
  const recording = fakeClient({
    pages: [
      {
        nodes: [
          { number: 12, isDraft: false },
          { number: 13, isDraft: true },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    ],
  });
  assert.equal(
    await main(
      eventOptions(recording.client, "issues", {
        label: { name: "decision: accepted" },
      }),
    ),
    0,
  );
  assert.deepEqual(recording.calls[0].variables.labels, ["tier/3"]);
  assert.match(recording.calls[0].query, /pullRequests\(states: OPEN/);
  assert.deepEqual(
    recording.calls
      .filter((call) => call.query?.includes("query ReviewTierPullRequest("))
      .map(({ variables }) => variables.number),
    [12],
  );
});

test("workflow relay files accept a number and reject shell text before making API calls", async () => {
  for (const customPath of [undefined, "relay/number"]) {
    const recording = fakeClient();
    const options = eventOptions(
      recording.client,
      "workflow_run",
      {},
      {
        env: {
          GITHUB_EVENT_NAME: "workflow_run",
          ...(customPath ? { REVIEW_TIER_RELAY_FILE: customPath } : {}),
        },
        policy: shadowPolicy,
        readFile: (file, encoding) => {
          assert.equal(file, customPath ?? "review-tier-pr/number");
          assert.equal(encoding, "utf8");
          return "12\n";
        },
      },
    );
    assert.equal(await main(options), 0);
    assert.equal(recording.writes[0].body.conclusion, "neutral");
  }
  for (const text of [
    "12; rm -rf /",
    "12\n13",
    "",
    "0",
    "-1",
    "1.2",
    "9007199254740992",
  ]) {
    const recording = fakeClient();
    await assert.rejects(
      main(
        eventOptions(
          recording.client,
          "workflow_run",
          {},
          {
            env: { GITHUB_EVENT_NAME: "workflow_run" },
            readFile: () => text,
          },
        ),
      ),
      /only digits/,
    );
    assert.deepEqual(recording.calls, []);
  }
});

test("schedule and dispatch page through open non-draft pull requests and continue after one fails", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  for (const eventName of ["schedule", "workflow_dispatch"]) {
    const recording = fakeClient({
      failures: [12],
      pages: [
        {
          nodes: [
            { number: 12, isDraft: false },
            { number: 13, isDraft: true },
          ],
          pageInfo: { hasNextPage: true, endCursor: "next-page" },
        },
        {
          nodes: [
            { number: 14, isDraft: false },
            { number: 15, isDraft: false },
          ],
          pageInfo: { hasNextPage: false, endCursor: "last-page" },
        },
      ],
    });
    assert.equal(await main(eventOptions(recording.client, eventName)), 1);
    assert.deepEqual(
      recording.calls
        .filter((call) =>
          call.query?.includes("query ReviewTierOpenPullRequests("),
        )
        .map(({ variables }) => [variables.after, variables.labels]),
      eventName === "schedule"
        ? [
            [null, [tierLabel(policy, 2), tierLabel(policy, 3)]],
            ["next-page", [tierLabel(policy, 2), tierLabel(policy, 3)]],
          ]
        : [
            [null, null],
            ["next-page", null],
          ],
    );
    assert.deepEqual(
      recording.calls
        .filter((call) => call.query?.includes("query ReviewTierPullRequest("))
        .map(({ variables }) => variables.number),
      [12, 14, 15],
    );
    assert.equal(
      recording.writes.filter(({ resource }) =>
        resource.endsWith("/check-runs"),
      ).length,
      1,
    );
  }
  assert.equal(errors.mock.callCount(), 2);
  assert.match(
    errors.mock.calls[0].arguments[0],
    /Pull request #12: Recorded HTTP 500/,
  );
});

test("main fetches organization and teams once across two pull requests", async () => {
  const recording = fakeClient({
    pages: [
      {
        nodes: [
          { number: 12, isDraft: false },
          { number: 14, isDraft: false },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    ],
  });
  assert.equal(
    await main(eventOptions(recording.client, "workflow_dispatch")),
    0,
  );
  assert.deepEqual(
    recording.calls
      .filter(
        ({ kind, resource }) =>
          kind === "paginate" && resource.startsWith("/orgs/"),
      )
      .map(({ resource }) => resource),
    [
      "/orgs/assistant-ui/members?role=admin",
      `/orgs/assistant-ui/teams/${policy.teams.maintainers}/members`,
      `/orgs/assistant-ui/teams/${policy.teams.reviewers}/members`,
      "/orgs/assistant-ui/teams/owners/members",
    ],
  );
  assert.deepEqual(
    recording.calls
      .filter(({ query }) => query?.includes("query ReviewTierPullRequest("))
      .map(({ variables }) => variables.number),
    [12, 14],
  );
});

test("explicit dispatch input and pull request events evaluate one PR", async () => {
  for (const [name, event] of [
    ["workflow_dispatch", { inputs: { pr: "12" } }],
    ["pull_request_target", { pull_request: { number: 12, draft: false } }],
  ]) {
    const recording = fakeClient();
    assert.equal(await main(eventOptions(recording.client, name, event)), 0);
    assert.ok(
      recording.calls.some(
        (call) =>
          call.query?.includes("query ReviewTierPullRequest(") &&
          call.variables.number === 12,
      ),
    );
    assert.equal(recording.writes[0].body.conclusion, "action_required");
    assert.equal(recording.writes[0].body.started_at, now.toISOString());
    assert.equal(
      recording.writes.filter(
        ({ resource }) => resource === `${repo}/check-runs`,
      ).length,
      1,
    );
    assert.equal(
      recording.calls.filter(({ query }) =>
        query?.includes("query ReviewTierPullRequest("),
      ).length,
      1,
    );
    const rereads = recording.calls.filter(({ query }) =>
      query?.includes("query ReviewTierPullRequestState("),
    );
    assert.equal(rereads.length, 1);
    assert.deepEqual(rereads[0].variables, {
      owner: "assistant-ui",
      name: "assistant-ui",
      number: 12,
    });
    assert.match(
      rereads[0].query,
      /pullRequest\(number: \$number\) \{ updatedAt headRefOid \}/,
    );
    assert.ok(
      recording.calls.indexOf(rereads[0]) <
        recording.calls.findIndex(
          ({ kind, method, resource }) =>
            kind === "rest" &&
            method === "POST" &&
            resource === `${repo}/check-runs`,
        ),
    );
  }
});

test("an updated pull request publishes only the second gather", async () => {
  const first = tapPullRequest();
  const second = tapPullRequest({
    updatedAt: "2026-10-08T11:31:00Z",
    reviews: { nodes: [] },
  });
  const recording = fakeClient({
    prSnapshots: [first, second],
    stateSnapshots: [second, second],
  });
  assert.equal(
    await main({
      args: ["--pr", "12"],
      env: {},
      client: recording.client,
      policy: enforcePolicy,
      now,
    }),
    0,
  );
  const gathers = recording.calls.filter(({ query }) =>
    query?.includes("query ReviewTierPullRequest("),
  );
  const rereads = recording.calls.filter(({ query }) =>
    query?.includes("query ReviewTierPullRequestState("),
  );
  const checks = recording.writes.filter(
    ({ method, resource }) =>
      method === "POST" && resource === `${repo}/check-runs`,
  );
  assert.equal(gathers.length, 2);
  assert.equal(rereads.length, 2);
  assert.equal(checks.length, 1);
  assert.ok(Date.parse(checks[0].body.started_at) > now.getTime());
  assert.match(checks[0].body.output.summary, /Counted approvals:\n\nNone\./);
  assert.ok(
    recording.calls.indexOf(rereads[0]) > recording.calls.indexOf(gathers[0]),
  );
  assert.ok(
    recording.calls.indexOf(gathers[1]) > recording.calls.indexOf(rereads[0]),
  );
  assert.ok(
    recording.calls.indexOf(rereads[1]) > recording.calls.indexOf(gathers[1]),
  );
  assert.ok(
    recording.calls.findIndex(
      ({ method, resource }) =>
        method === "POST" && resource === `${repo}/check-runs`,
    ) > recording.calls.indexOf(rereads[1]),
  );
});

test("a changed pull request head publishes only on the new SHA", async () => {
  const next = tapPullRequest({
    headRefOid: "new-head",
    commits: { nodes: [commit("new-head", "samdickson22")] },
  });
  const recording = fakeClient({
    prSnapshots: [tapPullRequest(), next],
    stateSnapshots: [next, next],
  });
  assert.equal(
    await main({
      args: ["--pr", "12"],
      env: {},
      client: recording.client,
      policy: enforcePolicy,
      now,
    }),
    0,
  );
  assert.deepEqual(
    recording.writes
      .filter(({ resource }) => resource === `${repo}/check-runs`)
      .map(({ body }) => body.head_sha),
    ["new-head"],
  );
  assert.equal(
    recording.calls.filter(({ query }) =>
      query?.includes("query ReviewTierPullRequestState("),
    ).length,
    2,
  );
});

test("a changing pull request publishes the third gather and later pull requests still publish", async () => {
  const first = tapPullRequest();
  const second = tapPullRequest({
    updatedAt: "2026-10-08T11:31:00Z",
    reviews: { nodes: [] },
  });
  const third = tapPullRequest({
    updatedAt: "2026-10-08T11:32:00Z",
    reviews: { nodes: [review("Yonom")] },
  });
  const recording = fakeClient({
    prSnapshots: [first, second, third],
    stateSnapshots: [second, third],
    prByNumber: {
      14: tapPullRequest({ headRefOid: "head-14" }),
    },
    pages: [
      {
        nodes: [
          { number: 12, isDraft: false },
          { number: 14, isDraft: false },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    ],
  });
  assert.equal(
    await main(eventOptions(recording.client, "workflow_dispatch")),
    0,
  );
  assert.deepEqual(
    recording.calls
      .filter(({ query }) =>
        query?.includes("query ReviewTierPullRequestState("),
      )
      .map(({ variables }) => variables.number),
    [12, 12, 14],
  );
  assert.deepEqual(
    recording.calls
      .filter(({ query }) => query?.includes("query ReviewTierPullRequest("))
      .map(({ variables }) => variables.number),
    [12, 12, 12, 14],
  );
  assert.deepEqual(
    recording.writes
      .filter(({ resource }) => resource.endsWith("/check-runs"))
      .map(({ body }) => body.head_sha),
    ["head", "head-14"],
  );
  const checks = recording.writes.filter(
    ({ resource }) => resource === `${repo}/check-runs`,
  );
  assert.ok(Date.parse(checks[0].body.started_at) > now.getTime());
  assert.match(checks[0].body.output.summary, /Yonom/);
  assert.ok(
    recording.writes.some(
      ({ resource }) => resource === `${repo}/issues/14/comments`,
    ),
  );
  assert.ok(
    recording.writes.some(
      ({ resource }) => resource === `${repo}/issues/12/comments`,
    ),
  );
});

test("closing or drafting a pull request re-evaluates the author's open siblings", async () => {
  for (const [action, draft] of [
    ["closed", false],
    ["converted_to_draft", true],
  ]) {
    const recording = fakeClient({
      authorPages: [
        {
          nodes: [{ number: 12 }, { number: 13 }],
          pageInfo: { hasNextPage: true, endCursor: "next-page" },
        },
        {
          nodes: [{ number: 14 }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      ],
    });
    assert.equal(
      await main(
        eventOptions(recording.client, "pull_request_target", {
          action,
          pull_request: {
            number: 12,
            draft,
            user: { login: "samdickson22" },
          },
        }),
      ),
      0,
    );
    assert.deepEqual(
      recording.calls
        .filter(({ query }) =>
          query?.includes("query ReviewTierAuthorPullRequests("),
        )
        .map(({ variables }) => [variables.query, variables.after]),
      [
        [
          `repo:${policy.repository} is:pr is:open draft:false author:samdickson22`,
          null,
        ],
        [
          `repo:${policy.repository} is:pr is:open draft:false author:samdickson22`,
          "next-page",
        ],
      ],
    );
    assert.deepEqual(
      recording.calls
        .filter(({ query }) => query?.includes("query ReviewTierPullRequest("))
        .map(({ variables }) => variables.number),
      [13, 14],
    );
    assert.deepEqual(
      recording.writes
        .filter(({ resource }) => resource.endsWith("/check-runs"))
        .map(({ body }) => body.started_at),
      [now.toISOString()],
    );
    assert.ok(
      recording.writes.some(
        ({ resource }) => resource === `${repo}/issues/13/comments`,
      ),
    );
    assert.ok(
      recording.writes.some(
        ({ resource }) => resource === `${repo}/issues/14/comments`,
      ),
    );
    assert.ok(
      !recording.writes.some(({ resource }) =>
        resource.includes("/issues/12/"),
      ),
    );
  }
});

test("maintainer authors do not trigger sibling evaluation", async () => {
  for (const login of ["okisdev", "Kinfe123"]) {
    const recording = fakeClient();
    assert.equal(
      await main(
        eventOptions(recording.client, "pull_request_target", {
          action: "closed",
          pull_request: { number: 12, draft: false, user: { login } },
        }),
      ),
      0,
    );
    assert.ok(
      !recording.calls.some(
        ({ query }) =>
          query?.includes("query ReviewTierAuthorPullRequests(") ||
          query?.includes("query ReviewTierPullRequest("),
      ),
    );
    assert.deepEqual(recording.writes, []);
  }
});

test("draft pull requests are skipped outside merge groups, including fresh draft state", async () => {
  for (const action of ["synchronize", "edited", "opened"]) {
    const eventDraft = fakeClient();
    assert.equal(
      await main(
        eventOptions(eventDraft.client, "pull_request_target", {
          action,
          pull_request: {
            number: 12,
            draft: true,
            user: { login: "samdickson22" },
          },
        }),
      ),
      0,
    );
    assert.deepEqual(eventDraft.calls, []);
  }
  const freshDraft = fakeClient({ pr: tapPullRequest({ isDraft: true }) });
  assert.equal(
    await main(
      eventOptions(freshDraft.client, "pull_request_target", {
        pull_request: { number: 12, draft: false },
      }),
    ),
    0,
  );
  assert.deepEqual(freshDraft.writes, []);
  assert.equal(
    await main({
      client: freshDraft.client,
      policy,
      now,
      args: ["--pr", "12"],
      env: {},
    }),
    0,
  );
  assert.deepEqual(freshDraft.writes, []);
});

test("--pr takes precedence over events and dry-run prints only the evaluation without publishing", async (t) => {
  const logs = t.mock.method(console, "log", () => {});
  const recording = fakeClient();
  const code = await main({
    args: ["--pr=12", "--dry-run"],
    env: { GITHUB_EVENT_NAME: "merge_group", GITHUB_EVENT_PATH: "unread.json" },
    client: recording.client,
    policy,
    now,
    readFile: () => assert.fail("Event file must not be read"),
  });
  assert.equal(code, 0);
  assert.deepEqual(recording.writes, []);
  assert.equal(logs.mock.callCount(), 1);
  const evaluation = JSON.parse(logs.mock.calls[0].arguments[0]);
  assert.equal(evaluation.tierResult.tier, 3);
  assert.equal(evaluation.conclusion, "action_required");
  assert.equal(
    recording.calls.filter(({ query }) =>
      query?.includes("query ReviewTierPullRequest("),
    ).length,
    1,
  );
  assert.ok(
    !recording.calls.some(({ query }) =>
      query?.includes("query ReviewTierPullRequestState("),
    ),
  );
});

test("the CLI uses the policy mode instead of the environment mode", async () => {
  for (const mode of ["shadow", "enforce"]) {
    const recording = fakeClient();
    assert.equal(
      await main({
        args: ["--pr", "12"],
        env: {},
        client: recording.client,
        policy: {
          ...policy,
          reviewTierCheck: {
            ...policy.reviewTierCheck,
            integrationId: mode === "enforce" ? 42 : null,
            mode,
          },
        },
        now,
      }),
      0,
    );
    assert.equal(
      recording.writes[0].body.conclusion,
      mode === "enforce" ? "action_required" : "neutral",
    );
  }
});

test("invalid arguments and missing tokens fail before API calls, and unrelated events do nothing", async () => {
  for (const args of [
    ["--pr"],
    ["--pr="],
    ["--pr", "12", "--pr", "13"],
    ["--pr", "12x"],
  ]) {
    const recording = fakeClient();
    await assert.rejects(
      main({ args, client: recording.client, policy, env: {}, now }),
    );
    assert.deepEqual(recording.calls, []);
  }
  await assert.rejects(
    main({ args: ["--pr", "12"], policy, env: {}, now }),
    /GITHUB_TOKEN is required/,
  );
  assert.equal(
    await main({ args: [], policy, env: { GITHUB_EVENT_NAME: "push" }, now }),
    0,
  );
});

test("the executable guard reports invalid CLI input with exit status 1", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, "review-tier.mjs"), "--pr", "12; rm -rf /"],
    {
      encoding: "utf8",
      env: { ...process.env, GITHUB_TOKEN: "" },
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /only digits/);
  assert.equal(result.stdout, "");
});
