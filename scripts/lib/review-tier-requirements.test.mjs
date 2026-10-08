import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadReviewPolicy } from "./review-policy.mjs";
import { evaluateRequirements } from "./review-tier-requirements.mjs";

const loadedPolicy = loadReviewPolicy(
  path.resolve(import.meta.dirname, "../.."),
);
const policy = {
  ...loadedPolicy,
  areas: loadedPolicy.areas.map((area) => ({
    ...area,
    ownerTeam: area.id === "protocol" ? "protocol-owners" : area.ownerTeam,
  })),
};

function input(overrides = {}) {
  return {
    tier: 0,
    areas: [],
    failures: [],
    author: "contributor",
    authorHasWriteAccess: false,
    headSha: "head",
    commits: [{ sha: "head", author: "contributor", committer: "contributor" }],
    reviews: [],
    labels: [],
    linkedIssues: [],
    readyForReviewAt: "2026-10-04T12:00:00Z",
    now: "2026-10-08T12:00:00Z",
    openPullRequestCount: 1,
    admins: ["admin"],
    teams: {
      maintainers: ["alice", "bob"],
      reviewers: ["reviewer", "second-reviewer"],
      owners: ["alice", "owner-only"],
      "protocol-owners": ["bob"],
    },
    ...overrides,
  };
}

function review(author, overrides = {}) {
  return {
    author,
    isBot: false,
    state: "APPROVED",
    commitSha: "head",
    submittedAt: "2026-10-08T08:00:00Z",
    ...overrides,
  };
}

const overrideLabel = (signal, addedBy) => ({
  name: `${policy.labels.overridePrefix}${signal}`,
  addedBy,
});
const decisionIssue = (addedBy) => ({
  number: 123,
  labels: [{ name: policy.labels.decisionAccepted, addedBy }],
});
const codes = (result) => result.unmet.map(({ code }) => code).sort();

for (const author of ["alice", "admin"]) {
  test(`T0 needs no approvals for ${author}`, () => {
    assert.deepEqual(evaluateRequirements(input({ author }), policy), {
      status: "success",
      unmet: [],
      waived: [],
      approvals: { counted: [], ignored: [] },
    });
  });
}

for (const author of ["contributor", "reviewer"]) {
  test(`T0 needs one counted approval for ${author}`, () => {
    const pending = evaluateRequirements(input({ author }), policy);
    assert.equal(pending.status, "pending");
    assert.deepEqual(codes(pending), ["approvals"]);
    const approved = evaluateRequirements(
      input({ author, reviews: [review("second-reviewer")] }),
      policy,
    );
    assert.equal(approved.status, "success");
    assert.deepEqual(approved.approvals.counted, ["second-reviewer"]);
  });
}

for (const author of ["admin", "alice", "reviewer"]) {
  test(`T1 needs one counted approval for trusted author ${author}`, () => {
    const pending = evaluateRequirements(input({ tier: 1, author }), policy);
    assert.equal(pending.status, "pending");
    assert.deepEqual(codes(pending), ["approvals"]);
    assert.equal(
      evaluateRequirements(
        input({ tier: 1, author, reviews: [review("second-reviewer")] }),
        policy,
      ).status,
      "success",
    );
  });
}

test("a reviewers-team member counts as trusted at T1", () => {
  const result = evaluateRequirements(
    input({
      tier: 1,
      author: "reviewer",
      reviews: [review("second-reviewer")],
    }),
    policy,
  );
  assert.equal(result.status, "success");
  assert.deepEqual(result.approvals.counted, ["second-reviewer"]);
});

test("T1 needs two approvals including a maintainer for an untrusted author", () => {
  for (const logins of [[], ["alice"], ["reviewer", "second-reviewer"]]) {
    const result = evaluateRequirements(
      input({ tier: 1, reviews: logins.map((login) => review(login)) }),
      policy,
    );
    assert.equal(result.status, "pending");
    assert.deepEqual(codes(result), ["approvals"]);
    assert.match(result.unmet[0].detail, /needs 2 approvals/);
    assert.match(result.unmet[0].detail, /needs 1 maintainer approval/);
  }
  for (const maintainer of ["alice", "admin"]) {
    assert.equal(
      evaluateRequirements(
        input({ tier: 1, reviews: [review(maintainer), review("reviewer")] }),
        policy,
      ).status,
      "success",
    );
  }
});

for (const tier of [2, 3]) {
  test(`T${tier} requires two maintainers and an owner for each area`, () => {
    const request = input({
      tier,
      areas: ["reactivity", "protocol"],
      reviews: [review("alice"), review("admin")],
      linkedIssues: [decisionIssue("alice")],
    });
    const missingOwner = evaluateRequirements(request, policy);
    assert.equal(missingOwner.status, "pending");
    assert.deepEqual(codes(missingOwner), ["owner:protocol"]);
    request.reviews = [review("alice"), review("bob")];
    assert.equal(evaluateRequirements(request, policy).status, "success");
    request.reviews = [review("admin")];
    assert.deepEqual(codes(evaluateRequirements(request, policy)), [
      "approvals",
      "owner:protocol",
      "owner:reactivity",
    ]);
  });

  test(`reviewer approvals do not satisfy T${tier}'s maintainer count`, () => {
    const result = evaluateRequirements(
      input({
        tier,
        reviews: [review("alice"), review("reviewer")],
        linkedIssues: [decisionIssue("bob")],
      }),
      policy,
    );
    assert.equal(result.status, "pending");
    assert.deepEqual(result.approvals.counted, ["alice", "reviewer"]);
    assert.deepEqual(result.unmet, [
      {
        code: "approvals",
        detail: "needs 2 maintainer approvals on the current head, has 1",
      },
    ]);
  });
}

test("a trusted owner can sign off separately from the two maintainers", () => {
  const request = input({
    tier: 2,
    areas: ["reactivity"],
    reviews: [review("alice"), review("bob"), review("reviewer")],
    teams: { ...input().teams, "reviewer-owners": ["reviewer"] },
  });
  const custom = {
    ...policy,
    areas: policy.areas.map((area) =>
      area.id === "reactivity"
        ? { ...area, ownerTeam: "reviewer-owners" }
        : area,
    ),
  };
  assert.equal(evaluateRequirements(request, custom).status, "success");
});

test("owner membership alone does not make an approval trusted", () => {
  const result = evaluateRequirements(
    input({
      tier: 2,
      areas: ["reactivity"],
      reviews: [review("admin"), review("bob"), review("owner-only")],
    }),
    policy,
  );
  assert.deepEqual(codes(result), ["owner:reactivity"]);
  assert.deepEqual(result.approvals.ignored, [
    { login: "owner-only", reason: "untrusted" },
  ]);
});

test("lower tiers do not require area owners or a decision", () => {
  for (const tier of [0, 1]) {
    assert.equal(
      evaluateRequirements(
        input({
          tier,
          author: "alice",
          areas: ["protocol"],
          reviews: [review("admin")],
        }),
        policy,
      ).status,
      "success",
    );
  }
});

test("empty admin and maintainer teams remove maintainer trust", () => {
  const result = evaluateRequirements(
    input({
      tier: 3,
      areas: ["reactivity"],
      admins: [],
      teams: { ...input().teams, maintainers: [] },
      reviews: [review("alice")],
    }),
    policy,
  );
  assert.equal(result.status, "pending");
  assert.deepEqual(codes(result), [
    "approvals",
    "decision",
    "owner:reactivity",
  ]);
  assert.deepEqual(result.approvals.ignored, [
    { login: "alice", reason: "untrusted" },
  ]);
  assert.equal(
    evaluateRequirements(
      input({
        author: "admin",
        admins: ["admin"],
        teams: { ...input().teams, maintainers: [] },
      }),
      policy,
    ).status,
    "success",
  );
});

test("missing team slugs have no members", () => {
  const request = input({
    tier: 3,
    areas: ["reactivity"],
    admins: [],
    teams: {},
    reviews: [review("alice"), review("reviewer")],
    linkedIssues: [decisionIssue("alice")],
  });
  const result = evaluateRequirements(request, policy);
  assert.deepEqual(codes(result), [
    "approvals",
    "decision",
    "owner:reactivity",
  ]);
  assert.deepEqual(result.approvals.ignored, [
    { login: "alice", reason: "untrusted" },
    { login: "reviewer", reason: "untrusted" },
  ]);
  request.teams = { maintainers: ["alice", "bob"] };
  request.reviews = [review("alice"), review("bob"), review("reviewer")];
  const withMaintainers = evaluateRequirements(request, policy);
  assert.deepEqual(codes(withMaintainers), ["decision", "owner:reactivity"]);
  assert.deepEqual(withMaintainers.approvals.counted, ["alice", "bob"]);
  assert.deepEqual(withMaintainers.approvals.ignored, [
    { login: "reviewer", reason: "untrusted" },
  ]);
});

test("an unknown area cannot silently bypass owner or decision requirements", () => {
  const result = evaluateRequirements(
    input({
      tier: 3,
      areas: ["unknown"],
      reviews: [review("alice"), review("bob")],
      linkedIssues: [decisionIssue("alice")],
    }),
    policy,
  );
  assert.deepEqual(codes(result), ["decision", "owner:unknown"]);
});

for (const state of ["CHANGES_REQUESTED", "DISMISSED"]) {
  test(`a later ${state} replaces an approval regardless of array order`, () => {
    const reviews = [
      review("alice"),
      review("alice", { state, submittedAt: "2026-10-08T09:00:00Z" }),
    ];
    for (const ordered of [reviews, reviews.toReversed()]) {
      const result = evaluateRequirements(input({ reviews: ordered }), policy);
      assert.equal(result.status, "pending");
      assert.deepEqual(result.approvals, { counted: [], ignored: [] });
    }
  });
}

for (const state of ["COMMENTED", "PENDING"]) {
  test(`${state} does not change the reviewer's effective state`, () => {
    const later = review("alice", {
      state,
      submittedAt: "2026-10-08T09:00:00Z",
    });
    const approved = evaluateRequirements(
      input({ reviews: [review("alice"), later] }),
      policy,
    );
    assert.equal(approved.status, "success");
    assert.deepEqual(approved.approvals.counted, ["alice"]);
    const rejected = evaluateRequirements(
      input({
        reviews: [review("alice", { state: "CHANGES_REQUESTED" }), later],
      }),
      policy,
    );
    assert.deepEqual(rejected.approvals, { counted: [], ignored: [] });
    assert.deepEqual(
      evaluateRequirements(input({ reviews: [later] }), policy).approvals,
      { counted: [], ignored: [] },
    );
  });
}

test("the latest approval restores a reviewer once and uses its commit SHA", () => {
  const result = evaluateRequirements(
    input({
      reviews: [
        review("alice", { submittedAt: "2026-10-08T07:00:00-02:00" }),
        review("alice", {
          state: "DISMISSED",
          submittedAt: "2026-10-08T08:30:00Z",
        }),
        review("alice", { commitSha: "missing" }),
      ],
    }),
    policy,
  );
  assert.equal(result.status, "success");
  assert.deepEqual(result.approvals, { counted: ["alice"], ignored: [] });
  const stale = evaluateRequirements(
    input({
      reviews: [
        review("alice"),
        review("alice", {
          commitSha: "missing",
          submittedAt: "2026-10-08T09:00:00Z",
        }),
      ],
    }),
    policy,
  );
  assert.deepEqual(stale.approvals.ignored, [
    { login: "alice", reason: "stale" },
  ]);
});

for (const { login, isBot, commitSha, reason } of [
  { login: "contributor", isBot: true, commitSha: null, reason: "author" },
  { login: "outsider", isBot: true, commitSha: null, reason: "bot" },
  { login: "outsider", isBot: false, commitSha: null, reason: "untrusted" },
  { login: "alice", isBot: false, commitSha: null, reason: "stale" },
  { login: "alice", isBot: false, commitSha: "head", reason: "contributor" },
]) {
  test(`candidate exclusion uses the first matching reason: ${reason}`, () => {
    const result = evaluateRequirements(
      input({
        commits: [{ sha: "head", author: "contributor", committer: login }],
        reviews: [review(login, { isBot, commitSha })],
      }),
      policy,
    );
    assert.equal(result.status, "pending");
    assert.deepEqual(result.approvals, {
      counted: [],
      ignored: [{ login, reason }],
    });
  });
}

test("duplicate approvals by one reviewer do not satisfy a two-approval requirement", () => {
  const result = evaluateRequirements(
    input({ tier: 1, reviews: [review("alice"), review("alice")] }),
    policy,
  );
  assert.equal(result.status, "pending");
  assert.deepEqual(result.approvals.counted, ["alice"]);
});

test("an approval before autofix commits is stale", () => {
  const result = evaluateRequirements(
    input({
      headSha: "autofix-2",
      commits: [
        { sha: "base", author: "contributor", committer: "contributor" },
        {
          sha: "autofix-1",
          author: "autofix-ci[bot]",
          committer: "autofix-ci[bot]",
        },
        {
          sha: "autofix-2",
          author: "autofix-ci[bot]",
          committer: "autofix-ci[bot]",
        },
      ],
      reviews: [review("alice", { commitSha: "base" })],
    }),
    policy,
  );
  assert.equal(result.status, "pending");
  assert.deepEqual(result.approvals, {
    counted: [],
    ignored: [{ login: "alice", reason: "stale" }],
  });
});

for (const author of ["contributor", null, "other[bot]"]) {
  test(`an approval is stale after a non-autofix commit by ${author}`, () => {
    const result = evaluateRequirements(
      input({
        commits: [
          { sha: "base", author: "contributor", committer: "contributor" },
          { sha: "head", author, committer: "alice" },
        ],
        reviews: [review("alice", { commitSha: "base" })],
      }),
      policy,
    );
    assert.deepEqual(result.approvals, {
      counted: [],
      ignored: [{ login: "alice", reason: "stale" }],
    });
  });
}

test("an intervening human commit remains stale after a final autofix commit", () => {
  const result = evaluateRequirements(
    input({
      commits: [
        { sha: "base", author: "contributor", committer: "contributor" },
        { sha: "human", author: "bob", committer: "web-flow" },
        {
          sha: "head",
          author: "autofix-ci[bot]",
          committer: "autofix-ci[bot]",
        },
      ],
      reviews: [review("alice", { commitSha: "base" })],
    }),
    policy,
  );
  assert.deepEqual(result.approvals.ignored, [
    { login: "alice", reason: "stale" },
  ]);
});

for (const commitSha of [null, "missing"]) {
  test(`an approval with commit SHA ${commitSha} is stale`, () => {
    assert.deepEqual(
      evaluateRequirements(
        input({ reviews: [review("alice", { commitSha })] }),
        policy,
      ).approvals,
      { counted: [], ignored: [{ login: "alice", reason: "stale" }] },
    );
  });
}

test("commits before the approved commit do not make the approval stale", () => {
  const result = evaluateRequirements(
    input({
      commits: [
        { sha: "base", author: "bob", committer: "bob" },
        { sha: "head", author: "contributor", committer: "contributor" },
      ],
      reviews: [review("alice")],
    }),
    policy,
  );
  assert.equal(result.status, "success");
});

for (const committer of [null, "web-flow"]) {
  test(`a commit author is a contributor with committer ${committer}`, () => {
    const result = evaluateRequirements(
      input({
        commits: [{ sha: "head", author: "alice", committer }],
        reviews: [review("alice")],
      }),
      policy,
    );
    assert.deepEqual(result.approvals.ignored, [
      { login: "alice", reason: "contributor" },
    ]);
  });
}

test("a commit author and committer are both contributors", () => {
  const result = evaluateRequirements(
    input({
      commits: [{ sha: "head", author: "alice", committer: "bob" }],
      reviews: [review("alice"), review("bob")],
    }),
    policy,
  );
  assert.deepEqual(result.approvals, {
    counted: [],
    ignored: [
      { login: "alice", reason: "contributor" },
      { login: "bob", reason: "contributor" },
    ],
  });
});

for (const field of ["author", "committer"]) {
  test(`a reviewer who was the ${field} of an earlier commit is a contributor`, () => {
    const result = evaluateRequirements(
      input({
        commits: [
          {
            sha: "base",
            author: "contributor",
            committer: "contributor",
            [field]: "alice",
          },
          {
            sha: "head",
            author: "autofix-ci[bot]",
            committer: "autofix-ci[bot]",
          },
        ],
        reviews: [review("alice")],
      }),
      policy,
    );
    assert.deepEqual(result.approvals.ignored, [
      { login: "alice", reason: "contributor" },
    ]);
  });
}

test("commit history does not affect an approval on the current head", () => {
  const request = input({ commits: [], reviews: [review("alice")] });
  assert.deepEqual(evaluateRequirements(request, policy).approvals.counted, [
    "alice",
  ]);
  request.commits = [
    { sha: "head", author: "autofix-ci[bot]", committer: "alice" },
  ];
  assert.deepEqual(evaluateRequirements(request, policy).approvals.ignored, [
    { login: "alice", reason: "contributor" },
  ]);
});

test("web-flow committer excludes nobody else", () => {
  const result = evaluateRequirements(
    input({
      commits: [{ sha: "head", author: "contributor", committer: "web-flow" }],
      reviews: [review("alice"), review("bob")],
    }),
    policy,
  );
  assert.deepEqual(result.approvals, {
    counted: ["alice", "bob"],
    ignored: [],
  });
});

test("T3 accepts a linked decision from any affected owner", () => {
  const request = input({
    tier: 3,
    areas: ["reactivity", "protocol"],
    reviews: [review("alice"), review("bob")],
  });
  for (const addedBy of ["contributor", "admin", null]) {
    request.linkedIssues = [decisionIssue(addedBy)];
    const result = evaluateRequirements(request, policy);
    assert.equal(result.status, "pending");
    assert.deepEqual(codes(result), ["decision"]);
  }
  for (const addedBy of ["alice", "bob", "owner-only"]) {
    request.linkedIssues = [
      decisionIssue("contributor"),
      decisionIssue(addedBy),
    ];
    assert.equal(evaluateRequirements(request, policy).status, "success");
  }
});

test("a decision requires the exact label on a linked issue", () => {
  const request = input({
    tier: 3,
    reviews: [review("alice"), review("bob")],
    labels: [{ name: policy.labels.decisionAccepted, addedBy: "alice" }],
    linkedIssues: [
      { number: 1, labels: [{ name: "decision: proposed", addedBy: "alice" }] },
    ],
  });
  assert.deepEqual(codes(evaluateRequirements(request, policy)), ["decision"]);
});

test("maintainers and admins can decide only when no areas are affected", () => {
  const request = input({ tier: 3, reviews: [review("alice"), review("bob")] });
  for (const addedBy of ["owner-only", null]) {
    request.linkedIssues = [decisionIssue(addedBy)];
    assert.deepEqual(codes(evaluateRequirements(request, policy)), [
      "decision",
    ]);
  }
  for (const addedBy of ["bob", "admin"]) {
    request.linkedIssues = [decisionIssue(addedBy)];
    assert.equal(evaluateRequirements(request, policy).status, "success");
  }
  request.areas = ["reactivity"];
  assert.deepEqual(codes(evaluateRequirements(request, policy)), ["decision"]);
  request.areas = [];
  request.teams.maintainers = [];
  assert.ok(!codes(evaluateRequirements(request, policy)).includes("decision"));
  request.linkedIssues = [decisionIssue("bob")];
  assert.ok(codes(evaluateRequirements(request, policy)).includes("decision"));
});

for (const tier of [2, 3]) {
  test(`T${tier}'s waiting window is satisfied at the exact policy boundary`, () => {
    const request = input({
      tier,
      reviews: [review("alice"), review("bob")],
      linkedIssues: [decisionIssue("alice")],
    });
    const boundary =
      Date.parse(request.readyForReviewAt) +
      policy.windowHours[tier] * 3_600_000;
    request.now = new Date(boundary - 1).toISOString();
    const pending = evaluateRequirements(request, policy);
    assert.equal(pending.status, "pending");
    assert.deepEqual(codes(pending), ["window"]);
    for (const offset of [0, 1]) {
      request.now = new Date(boundary + offset).toISOString();
      assert.equal(evaluateRequirements(request, policy).status, "success");
    }
  });
}

test("an unreadable ready time keeps the window unmet", () => {
  const request = input({
    tier: 2,
    reviews: [review("alice"), review("bob")],
    readyForReviewAt: null,
    now: new Date().toISOString(),
  });
  assert.deepEqual(codes(evaluateRequirements(request, policy)), ["window"]);
});

test("window overrides require an admin or affected owner and record the grantor", () => {
  const request = input({
    tier: 2,
    areas: ["reactivity"],
    reviews: [review("alice"), review("bob")],
    readyForReviewAt: "2026-10-08T11:00:00Z",
  });
  for (const addedBy of ["contributor", "bob", "reviewer", null]) {
    request.labels = [overrideLabel("window", addedBy)];
    const result = evaluateRequirements(request, policy);
    assert.equal(result.status, "pending");
    assert.deepEqual(codes(result), ["window"]);
    assert.deepEqual(result.waived, []);
  }
  for (const addedBy of ["alice", "owner-only", "admin"]) {
    request.labels = [overrideLabel("window", addedBy)];
    const result = evaluateRequirements(request, policy);
    assert.equal(result.status, "success");
    assert.deepEqual(result.waived, [
      { code: "window", signal: "window", by: addedBy },
    ]);
  }
});

test("maintainer decision authority does not grant override authority", () => {
  const request = input({
    tier: 3,
    reviews: [review("alice"), review("bob")],
    linkedIssues: [decisionIssue("alice")],
    readyForReviewAt: "2026-10-08T11:00:00Z",
    labels: [overrideLabel("window", "alice")],
  });
  assert.deepEqual(codes(evaluateRequirements(request, policy)), ["window"]);
  request.labels = [overrideLabel("window", "admin")];
  assert.equal(evaluateRequirements(request, policy).status, "success");
});

test("an expired window does not record an unnecessary waiver", () => {
  const result = evaluateRequirements(
    input({
      tier: 2,
      reviews: [review("alice"), review("bob")],
      labels: [overrideLabel("window", "admin")],
    }),
    policy,
  );
  assert.equal(result.status, "success");
  assert.deepEqual(result.waived, []);
});

test("only matching size and type overrides waive input failures", () => {
  const failures = [
    { code: "size-cap", detail: "too many source lines", override: "size" },
    { code: "title-type", detail: "unknown title type", override: "type" },
    { code: "blocked", detail: "cannot be waived", override: null },
  ];
  for (const signal of ["size", "type", "window"]) {
    const result = evaluateRequirements(
      input({
        author: "alice",
        failures,
        labels: [overrideLabel(signal, "admin")],
      }),
      policy,
    );
    assert.equal(result.status, "failure");
    assert.deepEqual(
      result.unmet,
      failures
        .filter((failure) => failure.override !== signal)
        .map(({ code, detail }) => ({ code, detail })),
    );
    assert.deepEqual(
      result.waived,
      failures
        .filter((failure) => failure.override === signal)
        .map(({ code }) => ({ code, signal, by: "admin" })),
    );
  }
  const result = evaluateRequirements(
    input({
      author: "alice",
      failures: failures.slice(0, 2),
      labels: [overrideLabel("size", "admin"), overrideLabel("type", "admin")],
    }),
    policy,
  );
  assert.equal(result.status, "success");
  assert.deepEqual(result.unmet, []);
  assert.equal(result.waived.length, 2);
});

test("size and type overrides need authority and only recognized labels count", () => {
  for (const signal of ["size", "type"]) {
    const request = input({
      author: "alice",
      areas: ["reactivity"],
      failures: [{ code: signal, detail: "failed", override: signal }],
    });
    for (const label of [
      overrideLabel(signal, "bob"),
      overrideLabel(signal, null),
      overrideLabel("unknown", "admin"),
      { name: `other/override: ${signal}`, addedBy: "admin" },
    ]) {
      request.labels = [label];
      const result = evaluateRequirements(request, policy);
      assert.equal(result.status, "failure");
      assert.deepEqual(codes(result), [signal]);
      assert.deepEqual(result.waived, []);
    }
    request.labels = [overrideLabel(signal, "owner-only")];
    assert.equal(evaluateRequirements(request, policy).status, "success");
  }
});

test("each waived failure records the first authorized matching override", () => {
  const result = evaluateRequirements(
    input({
      author: "alice",
      areas: ["reactivity"],
      failures: [
        { code: "size-a", detail: "a", override: "size" },
        { code: "size-b", detail: "b", override: "size" },
      ],
      labels: [
        overrideLabel("size", "bob"),
        overrideLabel("size", "owner-only"),
        overrideLabel("size", "admin"),
      ],
    }),
    policy,
  );
  assert.equal(result.status, "success");
  assert.deepEqual(result.waived, [
    { code: "size-a", signal: "size", by: "owner-only" },
    { code: "size-b", signal: "size", by: "owner-only" },
  ]);
});

test("overrides never waive approvals, owners, decisions or the open-PR cap", () => {
  const result = evaluateRequirements(
    input({
      tier: 3,
      areas: ["reactivity"],
      authorHasWriteAccess: true,
      openPullRequestCount: policy.openPullRequestCap.withWriteAccess + 1,
      readyForReviewAt: "2026-10-08T11:00:00Z",
      labels: [
        "size",
        "type",
        "window",
        "approvals",
        "owner:reactivity",
        "decision",
        "open-pr-cap",
      ].map((signal) => overrideLabel(signal, "admin")),
    }),
    policy,
  );
  assert.equal(result.status, "failure");
  assert.deepEqual(codes(result), [
    "approvals",
    "decision",
    "open-pr-cap",
    "owner:reactivity",
  ]);
  assert.deepEqual(result.waived, [
    { code: "window", signal: "window", by: "admin" },
  ]);
});

test("the open-PR cap uses write access and exempts maintainers", () => {
  for (const author of ["contributor", "reviewer", "alice", "admin", null]) {
    for (const authorHasWriteAccess of [false, true]) {
      const cap = authorHasWriteAccess
        ? policy.openPullRequestCap.withWriteAccess
        : policy.openPullRequestCap.withoutWriteAccess;
      for (const openPullRequestCount of [cap, cap + 1]) {
        const result = evaluateRequirements(
          input({
            author,
            authorHasWriteAccess,
            openPullRequestCount,
            reviews: [review("bob")],
          }),
          policy,
        );
        const capped =
          ["contributor", "reviewer"].includes(author) &&
          openPullRequestCount > cap;
        assert.equal(result.status, capped ? "failure" : "success");
        assert.deepEqual(codes(result), capped ? ["open-pr-cap"] : []);
        if (capped) {
          assert.deepEqual(result.unmet, [
            {
              code: "open-pr-cap",
              detail: `allows at most ${cap} open non-draft pull requests for this author, has ${openPullRequestCount}`,
            },
          ]);
        }
      }
    }
  }
});

test("unwaived input failures take precedence over pending requirements", () => {
  const result = evaluateRequirements(
    input({
      failures: [{ code: "window", detail: "input failure", override: null }],
    }),
    policy,
  );
  assert.equal(result.status, "failure");
  assert.deepEqual(codes(result), ["approvals", "window"]);
  assert.deepEqual(
    result.unmet.find(({ code }) => code === "window"),
    { code: "window", detail: "input failure" },
  );
});

test("waived failures leave unmet approval requirements pending", () => {
  const result = evaluateRequirements(
    input({
      failures: [{ code: "size", detail: "too large", override: "size" }],
      labels: [overrideLabel("size", "admin")],
    }),
    policy,
  );
  assert.equal(result.status, "pending");
  assert.deepEqual(codes(result), ["approvals"]);
});

test("policy team slugs, labels, windows and open PR caps control requirements", () => {
  const custom = {
    ...policy,
    teams: { maintainers: "core", reviewers: "external" },
    areas: [{ ...policy.areas[0], ownerTeam: "decision-owners" }],
    labels: {
      ...policy.labels,
      decisionAccepted: "custom: accepted",
      overridePrefix: "custom/",
      overrideSignals: ["window"],
    },
    windowHours: { 0: 2, 3: 4 },
    openPullRequestCap: { withWriteAccess: 1, withoutWriteAccess: 2 },
  };
  const request = input({
    tier: 3,
    areas: ["reactivity"],
    readyForReviewAt: "2026-10-08T11:00:00Z",
    commits: [
      { sha: "base", author: "contributor", committer: "contributor" },
      { sha: "head", author: "contributor", committer: "web-flow" },
    ],
    reviews: [review("alice"), review("bob")],
    linkedIssues: [
      { number: 1, labels: [{ name: "custom: accepted", addedBy: "owner" }] },
    ],
    labels: [{ name: "custom/window", addedBy: "owner" }],
    admins: ["alice"],
    teams: {
      core: ["bob"],
      external: ["reviewer"],
      "decision-owners": ["alice", "owner"],
    },
  });
  assert.equal(evaluateRequirements(request, custom).status, "success");
  request.areas = [];
  request.linkedIssues[0].labels[0].addedBy = "bob";
  request.labels[0].addedBy = "alice";
  assert.equal(evaluateRequirements(request, custom).status, "success");
  request.labels = [];
  assert.deepEqual(codes(evaluateRequirements(request, custom)), ["window"]);
  request.now = "2026-10-08T15:00:00Z";
  assert.equal(evaluateRequirements(request, custom).status, "success");
  request.authorHasWriteAccess = true;
  request.openPullRequestCount = 2;
  assert.deepEqual(codes(evaluateRequirements(request, custom)), [
    "open-pr-cap",
  ]);
  request.authorHasWriteAccess = false;
  request.tier = 0;
  request.now = "2026-10-08T12:00:00Z";
  request.reviews = [review("reviewer")];
  assert.deepEqual(codes(evaluateRequirements(request, custom)), ["window"]);
  request.failures = [{ code: "size", detail: "too large", override: "size" }];
  request.labels = [{ name: "custom/size", addedBy: "alice" }];
  assert.equal(evaluateRequirements(request, custom).status, "failure");
  assert.deepEqual(evaluateRequirements(request, custom).waived, []);
});

test("the merged reactivity PR still needs approvals, ownership, a decision and time", () => {
  const result = evaluateRequirements(
    input({
      tier: 3,
      areas: ["reactivity"],
      author: "samdickson22",
      authorHasWriteAccess: true,
      commits: [
        { sha: "head", author: "samdickson22", committer: "samdickson22" },
      ],
      reviews: [review("Kinfe123")],
      admins: [],
      teams: {
        ...input().teams,
        maintainers: ["Kinfe123"],
      },
      readyForReviewAt: "2026-10-08T11:00:00Z",
    }),
    policy,
  );
  assert.equal(result.status, "pending");
  assert.deepEqual(codes(result), [
    "approvals",
    "decision",
    "owner:reactivity",
    "window",
  ]);
  assert.deepEqual(result.approvals, { counted: ["Kinfe123"], ignored: [] });
  assert.deepEqual(result.waived, []);
});

test("evaluation is deterministic and does not mutate the input or policy", () => {
  const request = input({
    tier: 3,
    areas: ["reactivity", "protocol"],
    reviews: [review("alice"), review("bob")],
    linkedIssues: [decisionIssue("alice")],
    failures: [{ code: "size", detail: "too large", override: "size" }],
    labels: [overrideLabel("size", "admin")],
  });
  const originalInput = structuredClone(request);
  const originalPolicy = structuredClone(policy);
  function freeze(value) {
    if (value === null || typeof value !== "object") return;
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  freeze(request);
  freeze(originalPolicy);
  const first = evaluateRequirements(request, originalPolicy);
  assert.equal(first.status, "success");
  assert.deepEqual(evaluateRequirements(request, originalPolicy), first);
  assert.deepEqual(request, originalInput);
  assert.deepEqual(originalPolicy, policy);
});
