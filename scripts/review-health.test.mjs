import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { loadReviewPolicy } from "./lib/review-policy.mjs";
import { computeReviewHealth, renderReviewHealth } from "./review-health.mjs";

const policy = loadReviewPolicy(path.resolve(import.meta.dirname, ".."));
const people = {
  admins: ["admin"],
  teams: {
    [policy.teams.maintainers]: ["maintainer"],
    [policy.teams.reviewers]: ["trusted", "trusted2"],
  },
};

function mockGitHubFetch({ repository, teams, missingTeams }) {
  const orgUrl = `https://api.github.com/orgs/${repository.split("/")[0]}`;
  const adminsUrl = `${orgUrl}/members?role=admin&per_page=100`;
  const teamUrls = Object.values(teams).map(
    (slug) =>
      `${orgUrl}/teams/${encodeURIComponent(slug)}/members?per_page=100`,
  );
  const expectedCalls = [
    adminsUrl,
    `${adminsUrl}&page=2`,
    ...teamUrls.flatMap((url) =>
      missingTeams ? [url] : [url, `${url}&page=2`],
    ),
  ];
  const calls = [];
  const members = (login, next) =>
    new Response(JSON.stringify([{ login }]), {
      headers: next ? { Link: `<${next}>; rel="next"` } : {},
    });
  globalThis.fetch = async (url, options) => {
    if (url === "https://api.github.com/graphql") {
      if (JSON.stringify(calls) !== JSON.stringify(expectedCalls))
        throw new Error(`Unexpected membership requests: ${calls.join(", ")}`);
      return new Response(
        JSON.stringify({
          data: {
            repository: {
              pullRequests: {
                nodes: [],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          },
        }),
      );
    }
    if (
      url.startsWith(
        `https://api.github.com/repos/${repository}/rulesets/rule-suites?`,
      )
    )
      return new Response("[]");
    if (options.method && options.method !== "GET")
      throw new Error(`Unexpected membership method: ${options.method}`);
    calls.push(url);
    if (url === adminsUrl) return members("admin-one", `${adminsUrl}&page=2`);
    if (url === `${adminsUrl}&page=2`) return members("admin-two");
    for (const teamUrl of teamUrls) {
      if (url === teamUrl) {
        if (missingTeams)
          return new Response(null, { status: 404, statusText: "Not Found" });
        return members("team-one", `${teamUrl}&page=2`);
      }
      if (url === `${teamUrl}&page=2`) return members("team-two");
    }
    throw new Error(`Unexpected request: ${url}`);
  };
}

for (const missingTeams of [false, true]) {
  test(`CLI fetches organization owners and ${missingTeams ? "warns about missing" : "paginates both"} teams`, () => {
    const preload = `(${mockGitHubFetch.toString()})(${JSON.stringify({
      repository: policy.repository,
      teams: policy.teams,
      missingTeams,
    })})`;
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        `data:text/javascript,${encodeURIComponent(preload)}`,
        path.resolve(import.meta.dirname, "review-health.mjs"),
        "--since",
        "2026-10-01",
        "--until",
        "2026-10-07",
      ],
      { encoding: "utf8", env: { ...process.env, GITHUB_TOKEN: "test" } },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^# Review health, 2026-10-01 to 2026-10-07/m);
    for (const slug of Object.values(policy.teams)) {
      if (missingTeams)
        assert.match(result.stderr, new RegExp(`Team ${slug} does not exist`));
    }
    if (!missingTeams) assert.equal(result.stderr, "");
  });
}

const at = (hour) => `2026-10-01T${String(hour).padStart(2, "0")}:00:00Z`;
const review = (author, state, hour, isBot = false) => ({
  author,
  isBot,
  state,
  submittedAt: at(hour),
  commitSha: "head",
});
const pr = (number, overrides = {}) => ({
  number,
  title: "fix: example",
  author: "outsider",
  authorIsBot: false,
  mergedBy: "maintainer",
  mergedAt: at(12),
  mergeCommitSha: `merge-${number}`,
  labels: [],
  reviews: [],
  headSha: "head",
  additions: 1,
  deletions: 1,
  readyForReviewAt: at(0),
  firstMaintainerResponseAt: null,
  ...overrides,
});

const pullRequests = [
  pr(101, { author: "maintainer", mergedBy: "maintainer", labels: ["tier/0"] }),
  pr(102, {
    mergedBy: "admin",
    labels: ["tier/0"],
    firstMaintainerResponseAt: at(1),
  }),
  pr(103, {
    author: "trusted",
    mergedBy: "admin",
    labels: ["tier/1"],
    reviews: [review("admin", "APPROVED", 2)],
    firstMaintainerResponseAt: at(5),
  }),
  pr(104, {
    mergedBy: "admin",
    labels: ["tier/1", "review-tier/override: size"],
    reviews: [review("admin", "APPROVED", 2)],
    firstMaintainerResponseAt: at(3),
  }),
  pr(105, {
    title: 'Revert "fix: example"',
    labels: ["tier/2"],
    reviews: [
      review("reviewer", "APPROVED", 1),
      review("reviewer", "COMMENTED", 2),
      review("reviewer", "CHANGES_REQUESTED", 4),
      review("other", "APPROVED", 3),
      review("outsider", "APPROVED", 3),
      review("bot[bot]", "APPROVED", 3, true),
    ],
  }),
  pr(106, {
    labels: ["tier/3"],
    reviews: [
      review("a", "APPROVED", 1),
      review("b", "DISMISSED", 2),
      review("b", "APPROVED", 3),
    ],
    firstMaintainerResponseAt: at(9),
  }),
  pr(107, { labels: ["review-tier/override: unknown"] }),
];

const ruleSuites = [
  {
    id: 1,
    actorName: "admin",
    result: "bypass",
    afterSha: "merge-102",
    pushedAt: at(12),
  },
  {
    id: 1,
    actorName: "admin",
    result: "bypass",
    afterSha: "merge-102",
    pushedAt: at(12),
  },
  {
    id: 2,
    actorName: "outsider",
    result: "bypass",
    afterSha: "merge-105",
    pushedAt: at(12),
  },
  {
    id: 3,
    actorName: "admin",
    result: "pass",
    afterSha: "merge-103",
    pushedAt: at(12),
  },
  {
    id: 4,
    actorName: "outsider",
    result: "bypass",
    afterSha: "unknown",
    pushedAt: at(12),
  },
];

test("computeReviewHealth counts tiers, approvals, bypasses, and response time", () => {
  const result = computeReviewHealth(
    { pullRequests, ruleSuites, people },
    policy,
  );
  assert.equal(result.totalMerges, 7);
  assert.deepEqual(result.tierCounts, { 0: 2, 1: 2, 2: 1, 3: 1, untiered: 1 });
  assert.deepEqual(result.missingApprovals, [
    { number: 102, tier: 0, approvals: 0, minimum: 1 },
    { number: 105, tier: 2, approvals: 0, minimum: 1 },
    { number: 106, tier: 3, approvals: 0, minimum: 1 },
  ]);
  assert.deepEqual(result.adminBypasses, [
    { id: 1, actorName: "admin", number: 102 },
  ]);
  assert.deepEqual(result.outsideBypasses, [
    { id: 2, actorName: "outsider", number: 105 },
    { id: 4, actorName: "outsider", number: null },
  ]);
  assert.deepEqual(result.adminMergesBelowMinimum, [102]);
  assert.deepEqual(result.singleReviewerMerges, [103, 104]);
  assert.deepEqual(result.t0SelfMerges, [101]);
  assert.deepEqual(result.overrideUses, [104]);
  assert.deepEqual(result.reverts, [105]);
  assert.equal(result.medianResponseHours, 4);
  assert.equal(result.responseCount, 4);
  assert.equal(result.outsidePullRequests, 6);
});

test("latest decisive review wins while comments do not change approval", () => {
  const fixture = pr(201, {
    labels: ["tier/2"],
    reviews: [
      review("maintainer", "CHANGES_REQUESTED", 5),
      review("maintainer", "APPROVED", 7),
      review("maintainer", "COMMENTED", 8),
      review("admin", "APPROVED", 4),
      review("admin", "DISMISSED", 6),
    ],
  });
  const result = computeReviewHealth(
    { pullRequests: [fixture], ruleSuites: [], people },
    policy,
  );
  assert.deepEqual(result.missingApprovals, []);
  const dismissed = computeReviewHealth(
    {
      pullRequests: [
        {
          ...fixture,
          reviews: [...fixture.reviews, review("maintainer", "DISMISSED", 9)],
        },
      ],
      ruleSuites: [],
      people,
    },
    policy,
  );
  assert.deepEqual(dismissed.missingApprovals, [
    { number: 201, tier: 2, approvals: 0, minimum: 1 },
  ]);
});

test("reviewers-team members need one approval for T1", () => {
  const trusted = pr(202, {
    author: "Trusted",
    labels: ["tier/1"],
    reviews: [review("trusted2", "APPROVED", 2)],
  });
  const outsider = pr(203, {
    labels: ["tier/1"],
    reviews: [review("trusted", "APPROVED", 2)],
  });
  const unreviewed = pr(205, { author: "trusted", labels: ["tier/1"] });
  const result = computeReviewHealth(
    { pullRequests: [trusted, outsider, unreviewed], ruleSuites: [], people },
    policy,
  );
  assert.deepEqual(result.missingApprovals, [
    { number: 203, tier: 1, approvals: 1, minimum: 1 },
    { number: 205, tier: 1, approvals: 0, minimum: 1 },
  ]);
});

test("missing team membership counts as empty", () => {
  const result = computeReviewHealth(
    {
      pullRequests: [pr(204, { author: "trusted", labels: ["tier/1"] })],
      ruleSuites: [],
      people: { admins: [], teams: {} },
    },
    policy,
  );
  assert.deepEqual(result.missingApprovals, [
    { number: 204, tier: 1, approvals: 0, minimum: 1 },
  ]);
});

test("maintainer bypasses count outside organization owners", () => {
  const result = computeReviewHealth(
    {
      pullRequests: [],
      ruleSuites: [
        { id: 1, actorName: "Maintainer", result: "bypass", afterSha: null },
        { id: 2, actorName: "Admin", result: "bypass", afterSha: null },
      ],
      people,
    },
    policy,
  );
  assert.deepEqual(result.outsideBypasses, [
    { id: 1, actorName: "Maintainer", number: null },
  ]);
  assert.deepEqual(result.adminBypasses, [
    { id: 2, actorName: "Admin", number: null },
  ]);
});

test("renderReviewHealth includes every measure and exception list", () => {
  const metrics = computeReviewHealth(
    { pullRequests, ruleSuites, people },
    policy,
  );
  const markdown = renderReviewHealth(metrics, {
    since: "2026-10-01",
    until: "2026-10-07",
  });
  assert.match(markdown, /^# Review health, 2026-10-01 to 2026-10-07/m);
  for (const row of [
    "| Merges missing their tier's approvals | 3 | 0 |",
    "| Bypasses outside the organization owners | 2 | 0 |",
    "| Organization owner bypasses | 1 | Listed below |",
    "| Non-maintainer PRs approved and merged by one person | 2 | 0 |",
    "| First maintainer response on outside PRs, median hours | 4 hours (4 of 6 PRs) | Within 2 business days |",
    "| Reverts | 1 | Tracked |",
    "| Override uses | 1 | Tracked |",
  ])
    assert.ok(markdown.includes(row), row);
  for (const line of [
    "Merges missing their tier's approvals: #102, #105, #106",
    "Bypasses outside the organization owners: #105, Unmatched rule suite 4",
    "Organization owner bypasses: #102",
    "Organization owner merges of someone else's PR below the tier minimum: #102",
    "Non-maintainer PRs approved and merged by one person: #103, #104",
    "T0 self-merges with no approvals: #101",
    "Override uses: #104",
    "Reverts: #105",
  ])
    assert.ok(markdown.includes(line), line);
});

test("an empty period renders without a response median", () => {
  const metrics = computeReviewHealth(
    { pullRequests: [], ruleSuites: [], people },
    policy,
  );
  const markdown = renderReviewHealth(metrics, {
    since: "2026-10-01",
    until: "2026-10-07",
  });
  assert.equal(metrics.medianResponseHours, null);
  assert.match(markdown, /No responses recorded/);
  assert.match(markdown, /untiered: 0/);
  assert.match(markdown, /Override uses: None/);
});
