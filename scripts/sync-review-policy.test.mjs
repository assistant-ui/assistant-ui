import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadReviewPolicy } from "./lib/review-policy.mjs";
import {
  buildRulesets,
  renderCodeowners,
  requiredLabels,
  runSyncReviewPolicy,
} from "./sync-review-policy.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const policy = loadReviewPolicy(repoRoot);
const defaultBranch = "main";
const remotePolicyResponse = (endpoint, remotePolicy = policy) => {
  if (endpoint === `repos/${policy.repository}`) {
    return JSON.stringify({ default_branch: defaultBranch });
  }
  if (
    endpoint ===
    `repos/${policy.repository}/contents/.github/review-policy.json?ref=${defaultBranch}`
  ) {
    if (remotePolicy === null) throw new Error("gh: Not Found (HTTP 404)");
    return JSON.stringify({
      content: Buffer.from(JSON.stringify(remotePolicy)).toString("base64"),
    });
  }
  return null;
};
const conditions = { ref_name: { exclude: [], include: ["~DEFAULT_BRANCH"] } };
const basePullRequest = {
  allowed_merge_methods: ["squash"],
  dismiss_stale_reviews_on_push: false,
  dismissal_restriction: { allowed_actors: [], enabled: false },
  require_code_owner_review: false,
  require_extra_approval_for_unattributed_changes: true,
  require_last_push_approval: false,
  required_approving_review_count: 0,
  required_review_thread_resolution: false,
  required_reviewers: [],
};
const liveRulesets = [
  {
    id: 10374137,
    name: "Default Repository Policy",
    source_type: "Organization",
    target: "branch",
    enforcement: "active",
    conditions,
    bypass_actors: [],
    rules: [
      {
        type: "required_status_checks",
        parameters: {
          do_not_enforce_on_create: false,
          required_status_checks: [{ context: "org" }],
          strict_required_status_checks_policy: false,
        },
      },
    ],
  },
  {
    id: 18904557,
    name: "Always",
    source_type: "Repository",
    target: "branch",
    enforcement: "active",
    conditions,
    bypass_actors: [],
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "pull_request", parameters: basePullRequest },
      { type: "required_linear_history" },
      { type: "creation" },
    ],
  },
  {
    id: 821084,
    name: "Bypass-Admin",
    source_type: "Repository",
    target: "branch",
    enforcement: "active",
    conditions,
    bypass_actors: [
      {
        actor_id: 5,
        actor_type: "RepositoryRole",
        bypass_mode: "pull_request",
      },
    ],
    rules: [
      {
        type: "pull_request",
        parameters: { ...basePullRequest, require_code_owner_review: true },
      },
      {
        type: "required_status_checks",
        parameters: {
          do_not_enforce_on_create: false,
          required_status_checks: [
            { context: "autofix", integration_id: 15368 },
          ],
          strict_required_status_checks_policy: false,
        },
      },
    ],
  },
  {
    id: 11296070,
    name: "Bypass-Maintainer",
    source_type: "Repository",
    target: "branch",
    enforcement: "active",
    conditions,
    bypass_actors: [
      {
        actor_id: 2,
        actor_type: "RepositoryRole",
        bypass_mode: "pull_request",
      },
    ],
    rules: [
      {
        type: "pull_request",
        parameters: {
          ...basePullRequest,
          required_reviewers: [
            {
              file_patterns: ["*"],
              minimum_approvals: 1,
              reviewer: { id: 15592476, type: "Team" },
            },
          ],
        },
      },
    ],
  },
  {
    id: 19427140,
    name: "Code Quality Copilot review for default branch",
    source_type: "Repository",
    target: "branch",
    enforcement: "disabled",
    conditions,
    bypass_actors: [],
    rules: [
      {
        type: "copilot_code_review",
        parameters: { review_draft_pull_requests: false, review_on_push: true },
      },
    ],
  },
];
const repositoryRulesets = liveRulesets.filter(
  ({ source_type }) => source_type === "Repository",
);
const syncGh = ({ remotePolicy = policy, labels = [], teamError } = {}) => {
  const requests = [];
  const gh = (args) => {
    requests.push(args);
    if (args[0] === "--method") return "{}";
    if (args[0] === "--paginate") return JSON.stringify([labels]);
    const endpoint = args[0];
    const remote = remotePolicyResponse(endpoint, remotePolicy);
    if (remote !== null) return remote;
    if (
      endpoint === `repos/${policy.repository}/rulesets?includes_parents=false`
    ) {
      return JSON.stringify(repositoryRulesets.map(({ id }) => ({ id })));
    }
    const ruleset = repositoryRulesets.find(
      ({ id }) => endpoint === `repos/${policy.repository}/rulesets/${id}`,
    );
    if (ruleset) return JSON.stringify(ruleset);
    if (endpoint === "orgs/assistant-ui/teams/owners" && teamError) {
      throw teamError;
    }
    if (endpoint === `orgs/assistant-ui/teams/${policy.teams.maintainers}`) {
      return JSON.stringify({ id: 15592476 });
    }
    if (endpoint === "orgs/assistant-ui/teams/owners") {
      return JSON.stringify({ id: 1 });
    }
    assert.fail(`unexpected request ${args.join(" ")}`);
  };
  return { gh, requests };
};
const teamIds = {
  maintainers: 15592476,
};
const bypass_actors = [
  {
    actor_id: null,
    actor_type: "OrganizationAdmin",
    bypass_mode: "pull_request",
  },
];
const generalFloor = [
  {
    file_patterns: ["*"],
    minimum_approvals: 1,
    reviewer: { id: 15592476, type: "Team" },
  },
];
const rollout = (mode, enabled) => ({
  ...policy,
  reviewTierCheck: { ...policy.reviewTierCheck, integrationId: 905, mode },
  mergeQueue: { ...policy.mergeQueue, enabled },
});
const applyUpdates = (rulesets, updates) =>
  rulesets.map((live) => {
    const update = updates.find(({ id }) => id === live.id);
    return update ? { ...live, ...update.payload } : live;
  });

test("CODEOWNERS is rendered exactly from the real policy", () => {
  assert.equal(
    renderCodeowners(policy),
    `# Generated from .github/review-policy.json by scripts/sync-review-policy.mjs --write-codeowners; edit the policy, not this file.

# Reactivity core
/packages/tap/ @assistant-ui/owners
/packages/store/ @assistant-ui/owners
/apps/docs/content/docs/tap/ @assistant-ui/owners
/apps/docs/content/docs/store/ @assistant-ui/owners

# Wire protocol
/packages/assistant-stream/ @assistant-ui/owners

# Public API
/api-surface/ @assistant-ui/owners

# CI and policy
/.github/ @assistant-ui/owners
/CONTRIBUTING.md @assistant-ui/owners
/AGENTS.md @assistant-ui/owners
/scripts/review-tier.mjs @assistant-ui/owners
/scripts/diff-api-surface.mjs @assistant-ui/owners
/scripts/sync-review-policy.mjs @assistant-ui/owners
/scripts/review-health.mjs @assistant-ui/owners
/scripts/lib/review-*.mjs @assistant-ui/owners
`,
  );
});

test("ruleset updates replace only review floors and required checks", () => {
  const updates = buildRulesets(policy, liveRulesets, teamIds);
  assert.deepEqual(updates, [
    {
      id: 821084,
      payload: {
        name: "Required checks",
        target: "branch",
        enforcement: "active",
        conditions,
        bypass_actors,
        rules: [
          {
            type: "pull_request",
            parameters: {
              ...basePullRequest,
              require_code_owner_review: true,
              required_reviewers: generalFloor,
            },
          },
          {
            type: "required_status_checks",
            parameters: {
              do_not_enforce_on_create: false,
              strict_required_status_checks_policy: false,
              required_status_checks: [
                { context: "autofix", integration_id: 15368 },
                { context: "Build Changed Packages", integration_id: 15368 },
                { context: "Test Changed Packages", integration_id: 15368 },
                {
                  context: "Typecheck Changed Packages",
                  integration_id: 15368,
                },
                { context: "Review Policy Scripts", integration_id: 15368 },
              ],
            },
          },
        ],
      },
    },
    {
      id: 11296070,
      payload: {
        name: "Contract review floors",
        target: "branch",
        enforcement: "active",
        conditions,
        bypass_actors,
        rules: [
          {
            type: "pull_request",
            parameters: {
              ...basePullRequest,
              required_review_thread_resolution: true,
              required_reviewers: [
                {
                  file_patterns: [
                    "packages/tap/**",
                    "packages/store/**",
                    "apps/docs/content/docs/tap/**",
                    "apps/docs/content/docs/store/**",
                    "packages/assistant-stream/**",
                    "api-surface/**",
                    ".github/**",
                    "CONTRIBUTING.md",
                    "AGENTS.md",
                    "scripts/review-tier.mjs",
                    "scripts/diff-api-surface.mjs",
                    "scripts/sync-review-policy.mjs",
                    "scripts/review-health.mjs",
                    "scripts/lib/review-*.mjs",
                  ],
                  minimum_approvals: 2,
                  reviewer: { id: 15592476, type: "Team" },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
  assert.deepEqual(
    liveRulesets.find(({ id }) => id === 11296070).rules[0].parameters
      .required_reviewers[0].file_patterns,
    ["*"],
  );
});

test("review tier enforcement and the merge queue follow the policy", () => {
  for (const mode of ["shadow", "enforce"]) {
    for (const enabled of [false, true]) {
      const [checks] = buildRulesets(
        rollout(mode, enabled),
        liveRulesets,
        teamIds,
      );
      const status = checks.payload.rules.find(
        (rule) => rule.type === "required_status_checks",
      );
      assert.deepEqual(
        status.parameters.required_status_checks.filter(
          (check) => check.context === "review-tier",
        ),
        mode === "enforce"
          ? [{ context: "review-tier", integration_id: 905 }]
          : [],
      );
      assert.deepEqual(
        checks.payload.rules.filter((rule) => rule.type === "merge_queue"),
        enabled
          ? [{ type: "merge_queue", parameters: policy.mergeQueue.parameters }]
          : [],
      );
      assert.deepEqual(
        checks.payload.rules.find((rule) => rule.type === "pull_request")
          .parameters.required_reviewers,
        mode === "enforce" ? [] : generalFloor,
      );
    }
  }
});

test("syncing applied rulesets again changes only what the policy changes", () => {
  const interim = rollout("shadow", false);
  const final = rollout("enforce", true);
  const interimUpdates = buildRulesets(interim, liveRulesets, teamIds);
  const afterInterim = applyUpdates(liveRulesets, interimUpdates);
  assert.deepEqual(
    buildRulesets(interim, afterInterim, teamIds),
    interimUpdates,
  );
  const finalUpdates = buildRulesets(final, afterInterim, teamIds);
  assert.deepEqual(finalUpdates, buildRulesets(final, liveRulesets, teamIds));
  assert.deepEqual(
    buildRulesets(final, applyUpdates(afterInterim, finalUpdates), teamIds),
    finalUpdates,
  );
});

test("missing team ids and an unexpected ruleset layout fail clearly", () => {
  assert.throws(
    () => buildRulesets(policy, liveRulesets, {}),
    /Missing team id for maintainers/,
  );
  const checksRuleset = liveRulesets.find(({ id }) => id === 821084);
  assert.throws(
    () =>
      buildRulesets(
        policy,
        [...liveRulesets, { ...checksRuleset, id: 1 }],
        teamIds,
      ),
    /Expected one repository branch ruleset with required checks and one with required reviewers, found 2 and 1/,
  );
  assert.throws(
    () =>
      buildRulesets(
        policy,
        liveRulesets.filter(({ id }) => id !== 11296070),
        teamIds,
      ),
    /found 1 and 0/,
  );
});

test("a missing owner team stops the sync before any write", () => {
  const gh = (args) => {
    const endpoint = args.find((arg) => !arg.startsWith("-"));
    const remote = remotePolicyResponse(endpoint);
    if (remote !== null) return remote;
    if (endpoint.endsWith("/teams/owners")) throw new Error("HTTP 404");
    if (endpoint.endsWith(`/teams/${policy.teams.maintainers}`)) {
      return JSON.stringify({ id: teamIds[policy.teams.maintainers] });
    }
    if (endpoint.includes("/rulesets?")) {
      return JSON.stringify(repositoryRulesets.map(({ id }) => ({ id })));
    }
    const ruleset = liveRulesets.find(({ id }) =>
      endpoint.endsWith(`/rulesets/${id}`),
    );
    if (ruleset) return JSON.stringify(ruleset);
    assert.fail(`unexpected request ${args.join(" ")}`);
  };
  assert.throws(
    () =>
      runSyncReviewPolicy(["--apply"], { root: repoRoot, gh, log: () => {} }),
    /Owner team assistant-ui\/owners does not exist/,
  );
});

test("print and apply accept the merged policy and reject local drift before labels or writes", () => {
  for (const action of ["--print", "--apply"]) {
    const cwd = mkdtempSync(path.join(tmpdir(), "review-policy-"));
    try {
      const matching = syncGh();
      assert.equal(
        runSyncReviewPolicy([action], {
          root: repoRoot,
          cwd,
          gh: matching.gh,
          log: () => {},
        }),
        0,
      );
      assert.ok(
        matching.requests.some(([endpoint]) => endpoint === "--paginate"),
      );

      for (const remotePolicy of [
        { ...policy, repository: "assistant-ui/other" },
        null,
      ]) {
        const differing = syncGh({ remotePolicy });
        assert.throws(
          () =>
            runSyncReviewPolicy([action], {
              root: repoRoot,
              cwd,
              gh: differing.gh,
              log: () => assert.fail("no output expected"),
            }),
          /Local \.github\/review-policy\.json differs from main; merge the policy change before syncing\./,
        );
        assert.deepEqual(differing.requests, [
          [`repos/${policy.repository}`],
          [
            `repos/${policy.repository}/contents/.github/review-policy.json?ref=main`,
          ],
        ]);
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }
});

test("a non-404 owner team failure surfaces its original error", () => {
  const failure = new Error("HTTP 403: forbidden");
  const { gh, requests } = syncGh({ teamError: failure });
  assert.throws(
    () =>
      runSyncReviewPolicy(["--print"], { root: repoRoot, gh, log: () => {} }),
    (error) => error === failure,
  );
  assert.ok(!requests.some(([endpoint]) => endpoint === "--paginate"));
});

test("outdated label metadata is reported and patched while current labels are left alone", () => {
  const [current, outdated] = requiredLabels(policy);
  const labels = [current, { ...outdated, description: "old description" }];
  const printed = [];
  const printMock = syncGh({ labels });
  assert.equal(
    runSyncReviewPolicy(["--print"], {
      root: repoRoot,
      gh: printMock.gh,
      log: (message) => printed.push(message),
    }),
    0,
  );
  assert.ok(printed.includes(`Labels to update: ${outdated.name}`));
  assert.ok(printed.some((line) => line.startsWith("Missing labels: ")));
  assert.ok(!printMock.requests.some(([endpoint]) => endpoint === "--method"));

  const cwd = mkdtempSync(path.join(tmpdir(), "review-policy-"));
  try {
    const applied = [];
    const applyMock = syncGh({ labels });
    assert.equal(
      runSyncReviewPolicy(["--apply"], {
        root: repoRoot,
        cwd,
        gh: applyMock.gh,
        log: (message) => applied.push(message),
      }),
      0,
    );
    assert.ok(applied.includes(`Labels to update: ${outdated.name}`));
    assert.deepEqual(
      applyMock.requests.filter(
        (args) => args[0] === "--method" && args[1] === "PATCH",
      ),
      [
        [
          "--method",
          "PATCH",
          `repos/${policy.repository}/labels/${encodeURIComponent(outdated.name)}`,
          "-f",
          `color=${outdated.color}`,
          "-f",
          `description=${outdated.description}`,
        ],
      ],
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("rollout state is read from the policy, not from options", () => {
  for (const option of ["--require-review-tier", "--merge-queue"]) {
    assert.throws(
      () =>
        runSyncReviewPolicy(["--print", option], {
          root: repoRoot,
          gh: () => assert.fail("no request expected"),
          log: () => {},
        }),
      /Unknown option/,
    );
  }
});

test("required labels cover every label the policy names", () => {
  const labels = requiredLabels(policy);
  assert.deepEqual(
    labels.map(({ name }) => name),
    [
      "tier/0",
      "tier/1",
      "tier/2",
      "tier/3",
      "behavior-change",
      "decision: accepted",
      "review-tier/override: size",
      "review-tier/override: type",
      "review-tier/override: window",
    ],
  );
  for (const { color, description } of labels) {
    assert.match(color, /^[0-9a-f]{6}$/);
    assert.ok(description.length <= 100);
  }
});

test("apply saves every live ruleset before the first write", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "review-policy-"));
  const puts = [];
  const labelPosts = [];
  const gh = (args, { input } = {}) => {
    if (args[0] === "--paginate") {
      assert.equal(args[2], `repos/${policy.repository}/labels?per_page=100`);
      return JSON.stringify([
        [requiredLabels(policy)[0], { name: "type/bugfix" }],
        [requiredLabels(policy).find(({ name }) => name === "behavior-change")],
      ]);
    }
    if (args[0] === "--method") {
      const backups = readdirSync(cwd).filter((file) =>
        /^review-policy-rulesets-backup-.*\.json$/.test(file),
      );
      assert.equal(backups.length, 1);
      if (args[1] === "POST") {
        assert.equal(args[2], `repos/${policy.repository}/labels`);
        labelPosts.push(args[4].slice("name=".length));
        return "{}";
      }
      assert.equal(args[1], "PUT");
      assert.deepEqual(
        JSON.parse(readFileSync(path.join(cwd, backups[0]), "utf8")),
        repositoryRulesets,
      );
      puts.push({ args, payload: JSON.parse(input) });
      return "{}";
    }
    const endpoint = args[0];
    const remote = remotePolicyResponse(endpoint);
    if (remote !== null) return remote;
    if (
      endpoint === `repos/${policy.repository}/rulesets?includes_parents=false`
    ) {
      return JSON.stringify(repositoryRulesets.map(({ id }) => ({ id })));
    }
    const ruleset = repositoryRulesets.find(
      ({ id }) => endpoint === `repos/${policy.repository}/rulesets/${id}`,
    );
    if (ruleset) return JSON.stringify(ruleset);
    const team = endpoint.slice(
      `orgs/${policy.repository.split("/")[0]}/teams/`.length,
    );
    assert.ok([policy.teams.maintainers, "owners"].includes(team), endpoint);
    return JSON.stringify({ id: team === "owners" ? 1 : teamIds[team] });
  };
  try {
    assert.equal(
      runSyncReviewPolicy(["--apply"], {
        root: repoRoot,
        cwd,
        gh,
        log: () => {},
      }),
      0,
    );
    assert.deepEqual(
      puts.map(({ args }) => args),
      [
        [
          "--method",
          "PUT",
          `repos/${policy.repository}/rulesets/821084`,
          "--input",
          "-",
        ],
        [
          "--method",
          "PUT",
          `repos/${policy.repository}/rulesets/11296070`,
          "--input",
          "-",
        ],
      ],
    );
    assert.deepEqual(
      puts.map(({ payload }) => payload),
      buildRulesets(policy, liveRulesets, teamIds).map(
        ({ payload }) => payload,
      ),
    );
    assert.deepEqual(
      labelPosts,
      requiredLabels(policy)
        .map(({ name }) => name)
        .filter((name) => name !== "tier/0" && name !== "behavior-change"),
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
