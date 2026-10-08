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
    id: 18904557,
    name: "Always",
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

test("ruleset updates replace only contract floors and required checks", () => {
  const updates = buildRulesets(policy, liveRulesets, teamIds, {
    requireReviewTier: false,
    mergeQueue: false,
  });
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
          liveRulesets[1].rules[0],
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
    liveRulesets[2].rules[0].parameters.required_reviewers[0].file_patterns,
    ["*"],
  );
});

test("review tier and merge queue follow their independent options", () => {
  const withIntegration = {
    ...policy,
    reviewTierCheck: { name: "review-tier", integrationId: 905 },
  };
  for (const requireReviewTier of [false, true]) {
    for (const mergeQueue of [false, true]) {
      const [checks] = buildRulesets(withIntegration, liveRulesets, teamIds, {
        requireReviewTier,
        mergeQueue,
      });
      const status = checks.payload.rules.find(
        (rule) => rule.type === "required_status_checks",
      );
      assert.deepEqual(
        status.parameters.required_status_checks.filter(
          (check) => check.context === "review-tier",
        ),
        requireReviewTier
          ? [{ context: "review-tier", integration_id: 905 }]
          : [],
      );
      assert.deepEqual(
        checks.payload.rules.filter((rule) => rule.type === "merge_queue"),
        mergeQueue
          ? [{ type: "merge_queue", parameters: policy.mergeQueue }]
          : [],
      );
    }
  }
});

test("missing team ids and a null review tier integration fail clearly", () => {
  assert.throws(
    () =>
      buildRulesets(
        policy,
        liveRulesets,
        {},
        {
          requireReviewTier: false,
          mergeQueue: false,
        },
      ),
    /Missing team id for maintainers/,
  );
  assert.throws(
    () =>
      buildRulesets(policy, liveRulesets, teamIds, {
        requireReviewTier: true,
        mergeQueue: false,
      }),
    /reviewTierCheck\.integrationId is null/,
  );
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
        [{ name: "tier/0" }, { name: "type/bugfix" }],
        [{ name: "behavior-change" }],
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
      assert.deepEqual(
        JSON.parse(readFileSync(path.join(cwd, backups[0]), "utf8")),
        liveRulesets,
      );
      puts.push({ args, payload: JSON.parse(input) });
      return "{}";
    }
    const endpoint = args[0];
    if (endpoint === `repos/${policy.repository}/rulesets`) {
      return JSON.stringify(liveRulesets.map(({ id }) => ({ id })));
    }
    const ruleset = liveRulesets.find(
      ({ id }) => endpoint === `repos/${policy.repository}/rulesets/${id}`,
    );
    if (ruleset) return JSON.stringify(ruleset);
    assert.equal(
      endpoint,
      `orgs/${policy.repository.split("/")[0]}/teams/${policy.teams.maintainers}`,
    );
    return JSON.stringify({ id: teamIds[policy.teams.maintainers] });
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
      buildRulesets(policy, liveRulesets, teamIds, {
        requireReviewTier: false,
        mergeQueue: false,
      }).map(({ payload }) => payload),
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
