#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isExecutedAsMain } from "./lib/main.mjs";
import { loadReviewPolicy, tierLabel } from "./lib/review-policy.mjs";
import { hasOption } from "./lib/script-options.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const codeownersPath = ".github/CODEOWNERS";
const tierColors = ["0e8a16", "1d76db", "fbca04", "d93f0b"];

export function requiredLabels(policy) {
  const { behaviorChange, decisionAccepted, overridePrefix, overrideSignals } =
    policy.labels;
  return [
    ...tierColors.map((color, tier) => ({
      name: tierLabel(policy, tier),
      color,
      description: `Review tier T${tier}, set by the review-tier check`,
    })),
    {
      name: behaviorChange,
      color: "b60205",
      description:
        "Changes documented behavior, which makes the pull request T3",
    },
    {
      name: decisionAccepted,
      color: "5319e7",
      description:
        "An owner accepted this decision, so T3 pull requests may proceed",
    },
    ...overrideSignals.map((signal) => ({
      name: `${overridePrefix}${signal}`,
      color: "c5def5",
      description: `An owner waived the ${signal} signal on the current head`,
    })),
  ];
}

export function renderCodeowners(policy) {
  const org = policy.repository.split("/")[0];
  const lines = [
    "# Generated from .github/review-policy.json by scripts/sync-review-policy.mjs --write-codeowners; edit the policy, not this file.",
  ];
  for (const area of policy.areas) {
    lines.push("", `# ${area.name}`);
    for (const pattern of [...area.paths, ...area.contractDocs]) {
      lines.push(
        `/${pattern.replace(/\/\*\*$/, "/")} @${org}/${area.ownerTeam}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

function requiredTeamId(teamIds, slug) {
  const id = teamIds[slug];
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Missing team id for ${slug}.`);
  }
  return id;
}

export function buildRulesets(policy, liveRulesets, teamIds, options) {
  if (
    options.requireReviewTier &&
    policy.reviewTierCheck.integrationId === null
  ) {
    throw new Error(
      "reviewTierCheck.integrationId is null; --require-review-tier needs an integration id.",
    );
  }

  const bypass_actors = [
    {
      actor_id: null,
      actor_type: "OrganizationAdmin",
      bypass_mode: "pull_request",
    },
  ];
  const maintainers = {
    id: requiredTeamId(teamIds, policy.teams.maintainers),
    type: "Team",
  };
  const patterns = (area) => [...area.paths, ...area.contractDocs];
  const contractFloor = [
    {
      file_patterns: policy.areas.flatMap(patterns),
      minimum_approvals: 2,
      reviewer: maintainers,
    },
  ];
  const generalFloor = options.requireReviewTier
    ? []
    : [{ file_patterns: ["*"], minimum_approvals: 1, reviewer: maintainers }];

  return liveRulesets.flatMap((live) => {
    const checks = live.rules.some(
      (rule) => rule.type === "required_status_checks",
    );
    const floors =
      !checks &&
      live.rules.some(
        (rule) =>
          rule.type === "pull_request" &&
          rule.parameters.required_reviewers?.length > 0,
      );
    if (!floors && !checks) return [];

    const rules = live.rules
      .filter((rule) => !checks || rule.type !== "merge_queue")
      .map((rule) => {
        if (floors && rule.type === "pull_request") {
          return {
            ...rule,
            parameters: {
              ...rule.parameters,
              required_approving_review_count: 0,
              require_code_owner_review: false,
              dismiss_stale_reviews_on_push: false,
              require_last_push_approval: false,
              required_review_thread_resolution: true,
              required_reviewers: contractFloor,
            },
          };
        }
        if (checks && rule.type === "pull_request") {
          return {
            ...rule,
            parameters: {
              ...rule.parameters,
              required_reviewers: generalFloor,
            },
          };
        }
        if (checks && rule.type === "required_status_checks") {
          return {
            ...rule,
            parameters: {
              do_not_enforce_on_create: false,
              strict_required_status_checks_policy: false,
              required_status_checks: [
                ...policy.requiredChecks.map(({ context, integrationId }) => ({
                  context,
                  integration_id: integrationId,
                })),
                ...(options.requireReviewTier
                  ? [
                      {
                        context: policy.reviewTierCheck.name,
                        integration_id: policy.reviewTierCheck.integrationId,
                      },
                    ]
                  : []),
              ],
            },
          };
        }
        return rule;
      });
    if (checks && options.mergeQueue) {
      rules.push({ type: "merge_queue", parameters: policy.mergeQueue });
    }
    return [
      {
        id: live.id,
        payload: {
          name: floors ? "Contract review floors" : "Required checks",
          target: live.target,
          enforcement: live.enforcement,
          conditions: live.conditions,
          bypass_actors,
          rules,
        },
      },
    ];
  });
}

function runGh(args, { input, cwd } = {}) {
  return execFileSync("gh", ["api", ...args], {
    cwd,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function runSyncReviewPolicy(
  args,
  {
    root = repoRoot,
    cwd = process.cwd(),
    gh = runGh,
    log = console.log,
    error = console.error,
  } = {},
) {
  const actions = ["--check", "--write-codeowners", "--print", "--apply"];
  const selected = actions.filter((action) => hasOption(args, action));
  if (selected.length !== 1) {
    throw new Error(`Choose exactly one of ${actions.join(", ")}.`);
  }
  const known = new Set([...actions, "--require-review-tier", "--merge-queue"]);
  for (const arg of args) {
    if (!known.has(arg)) throw new Error(`Unknown option: ${arg}.`);
  }

  const policy = loadReviewPolicy(root);
  const codeowners = path.join(root, codeownersPath);
  if (selected[0] === "--check") {
    if (readFileSync(codeowners, "utf8") !== renderCodeowners(policy)) {
      error(
        "CODEOWNERS differs from review policy; run node scripts/sync-review-policy.mjs --write-codeowners.",
      );
      return 1;
    }
    return 0;
  }
  if (selected[0] === "--write-codeowners") {
    writeFileSync(codeowners, renderCodeowners(policy));
    return 0;
  }

  const api = (endpoint) => JSON.parse(gh([endpoint], { cwd }));
  const rulesetPath = `repos/${policy.repository}/rulesets`;
  const summaries = api(rulesetPath);
  const liveRulesets = summaries.map(({ id }) => api(`${rulesetPath}/${id}`));
  const org = policy.repository.split("/")[0];
  const slug = policy.teams.maintainers;
  const teamIds = { [slug]: api(`orgs/${org}/teams/${slug}`).id };
  const updates = buildRulesets(policy, liveRulesets, teamIds, {
    requireReviewTier: hasOption(args, "--require-review-tier"),
    mergeQueue: hasOption(args, "--merge-queue"),
  });
  const labelPath = `repos/${policy.repository}/labels`;
  const existingLabels = new Set(
    JSON.parse(
      gh(["--paginate", "--slurp", `${labelPath}?per_page=100`], { cwd }),
    )
      .flat()
      .map(({ name }) => name),
  );
  const missingLabels = requiredLabels(policy).filter(
    ({ name }) => !existingLabels.has(name),
  );
  log(
    missingLabels.length > 0
      ? `Missing labels: ${missingLabels.map(({ name }) => name).join(", ")}`
      : "Every policy label exists.",
  );
  if (selected[0] === "--apply") {
    writeFileSync(
      path.join(
        cwd,
        `review-policy-rulesets-backup-${new Date().toISOString()}.json`,
      ),
      `${JSON.stringify(liveRulesets, null, 2)}\n`,
    );
    for (const { name, color, description } of missingLabels) {
      gh(
        [
          "--method",
          "POST",
          labelPath,
          "-f",
          `name=${name}`,
          "-f",
          `color=${color}`,
          "-f",
          `description=${description}`,
        ],
        { cwd },
      );
    }
  }
  for (const { id, payload } of updates) {
    const input = `${JSON.stringify(payload, null, 2)}\n`;
    log(input.trimEnd());
    if (selected[0] === "--apply") {
      gh(["--method", "PUT", `${rulesetPath}/${id}`, "--input", "-"], {
        cwd,
        input,
      });
    }
  }
  return 0;
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  try {
    process.exitCode = runSyncReviewPolicy(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
