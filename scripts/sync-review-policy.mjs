#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
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
      description: `An owner waived the ${signal} signal until the label is removed`,
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

export function buildRulesets(policy, liveRulesets, teamIds) {
  const enforce = policy.reviewTierCheck.mode === "enforce";
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
      minimum_approvals: 1,
      reviewer: maintainers,
    },
  ];
  const generalFloor = enforce
    ? []
    : [{ file_patterns: ["*"], minimum_approvals: 1, reviewer: maintainers }];

  const branchRulesets = liveRulesets.filter(
    (live) => live.source_type === "Repository" && live.target === "branch",
  );
  const hasChecks = (live) =>
    live.rules.some((rule) => rule.type === "required_status_checks");
  const hasReviewers = (live) =>
    live.rules.some(
      (rule) =>
        rule.type === "pull_request" &&
        rule.parameters.required_reviewers?.length > 0,
    );
  const checksRulesets = branchRulesets.filter(hasChecks);
  const floorRulesets = branchRulesets.filter(
    (live) => !hasChecks(live) && hasReviewers(live),
  );
  if (checksRulesets.length !== 1 || floorRulesets.length !== 1) {
    throw new Error(
      `Expected one repository branch ruleset with required checks and one with required reviewers, found ${checksRulesets.length} and ${floorRulesets.length}.`,
    );
  }

  const update = (live, name, rules) => ({
    id: live.id,
    payload: {
      name,
      target: live.target,
      enforcement: live.enforcement,
      conditions: live.conditions,
      bypass_actors,
      rules,
    },
  });
  const checks = checksRulesets[0];
  const floors = floorRulesets[0];
  const checkRules = checks.rules
    .filter((rule) => rule.type !== "merge_queue")
    .map((rule) => {
      if (rule.type === "pull_request") {
        return {
          ...rule,
          parameters: { ...rule.parameters, required_reviewers: generalFloor },
        };
      }
      if (rule.type === "required_status_checks") {
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
              ...(enforce
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
  if (policy.mergeQueue.enabled) {
    checkRules.push({
      type: "merge_queue",
      parameters: policy.mergeQueue.parameters,
    });
  }
  const floorRules = floors.rules.map((rule) =>
    rule.type === "pull_request"
      ? {
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
        }
      : rule,
  );
  return [
    update(checks, "Required checks", checkRules),
    update(floors, "Contract review floors", floorRules),
  ];
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
  for (const arg of args) {
    if (!actions.includes(arg)) throw new Error(`Unknown option: ${arg}.`);
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
  const repositoryPath = `repos/${policy.repository}`;
  const { default_branch: defaultBranch } = api(repositoryPath);
  let remotePolicy = null;
  try {
    remotePolicy = JSON.parse(
      Buffer.from(
        api(
          `${repositoryPath}/contents/.github/review-policy.json?ref=${encodeURIComponent(defaultBranch)}`,
        ).content,
        "base64",
      ).toString("utf8"),
    );
  } catch (error) {
    if (!error.message.includes("HTTP 404")) throw error;
  }
  if (!isDeepStrictEqual(remotePolicy, policy)) {
    throw new Error(
      `Local .github/review-policy.json differs from ${defaultBranch}; merge the policy change before syncing.`,
    );
  }
  const rulesetPath = `${repositoryPath}/rulesets`;
  const summaries = api(`${rulesetPath}?includes_parents=false`);
  const liveRulesets = summaries.map(({ id }) => api(`${rulesetPath}/${id}`));
  const org = policy.repository.split("/")[0];
  const slug = policy.teams.maintainers;
  const teamIds = { [slug]: api(`orgs/${org}/teams/${slug}`).id };
  for (const ownerTeam of new Set(policy.areas.map((area) => area.ownerTeam))) {
    try {
      api(`orgs/${org}/teams/${ownerTeam}`);
    } catch (error) {
      if (error.message.includes("HTTP 404")) {
        throw new Error(
          `Owner team ${org}/${ownerTeam} does not exist; create it before syncing.`,
        );
      }
      throw error;
    }
  }
  const updates = buildRulesets(policy, liveRulesets, teamIds);
  const labelPath = `${repositoryPath}/labels`;
  const existingLabels = new Map(
    JSON.parse(
      gh(["--paginate", "--slurp", `${labelPath}?per_page=100`], { cwd }),
    )
      .flat()
      .map((label) => [label.name, label]),
  );
  const labels = requiredLabels(policy);
  const missingLabels = labels.filter(({ name }) => !existingLabels.has(name));
  const outdatedLabels = labels.filter(({ name, color, description }) => {
    const existing = existingLabels.get(name);
    return (
      existing &&
      (existing.color !== color || existing.description !== description)
    );
  });
  log(
    missingLabels.length > 0
      ? `Missing labels: ${missingLabels.map(({ name }) => name).join(", ")}`
      : "Every policy label exists.",
  );
  log(
    outdatedLabels.length > 0
      ? `Labels to update: ${outdatedLabels.map(({ name }) => name).join(", ")}`
      : "Every existing policy label is current.",
  );
  if (selected[0] === "--apply") {
    const backup = path.join(
      cwd,
      `review-policy-rulesets-backup-${new Date().toISOString()}.json`,
    );
    writeFileSync(backup, `${JSON.stringify(liveRulesets, null, 2)}\n`);
    log(`Saved the live rulesets to ${backup}.`);
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
    for (const { name, color, description } of outdatedLabels) {
      gh(
        [
          "--method",
          "PATCH",
          `${labelPath}/${encodeURIComponent(name)}`,
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
