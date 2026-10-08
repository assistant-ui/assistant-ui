import { readFileSync } from "node:fs";
import path from "node:path";

export const REVIEW_POLICY_PATH = ".github/review-policy.json";

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

export function validateReviewPolicy(policy) {
  const problems = [];
  const expect = (condition, message) => {
    if (!condition) problems.push(message);
  };

  expect(
    typeof policy?.repository === "string" &&
      /^[\w.-]+\/[\w.-]+$/.test(policy.repository),
    "repository must be owner/name",
  );
  for (const key of ["maintainers", "reviewers"]) {
    expect(
      typeof policy?.teams?.[key] === "string",
      `teams.${key} must be a team slug`,
    );
  }
  expect(
    Array.isArray(policy?.areas) && policy.areas.length > 0,
    "areas must be a non-empty array",
  );
  const areaIds = new Set();
  for (const area of policy?.areas ?? []) {
    expect(typeof area.id === "string", "every area needs an id");
    expect(!areaIds.has(area.id), `area id ${area.id} is repeated`);
    areaIds.add(area.id);
    expect(typeof area.name === "string", `area ${area.id} needs a name`);
    expect(
      typeof area.ownerTeam === "string",
      `area ${area.id} needs an ownerTeam`,
    );
    expect(
      isStringArray(area.paths) && area.paths.length > 0,
      `area ${area.id} needs paths`,
    );
    expect(
      isStringArray(area.contractDocs),
      `area ${area.id} needs contractDocs`,
    );
  }
  for (const key of [
    "decisionPaths",
    "lowRiskPaths",
    "testPaths",
    "generatedPaths",
    "types",
  ]) {
    expect(isStringArray(policy?.[key]), `${key} must be a string array`);
  }
  expect(
    Array.isArray(policy?.sizeCap?.tiers) &&
      policy.sizeCap.tiers.every((tier) => [0, 1, 2, 3].includes(tier)) &&
      isPositiveInteger(policy.sizeCap.sourceLines),
    "sizeCap needs tiers and sourceLines",
  );
  for (const tier of ["2", "3"]) {
    expect(
      isPositiveInteger(policy?.windowHours?.[tier]),
      `windowHours.${tier} must be a positive integer`,
    );
  }
  for (const key of ["withWriteAccess", "withoutWriteAccess"]) {
    expect(
      isPositiveInteger(policy?.openPullRequestCap?.[key]),
      `openPullRequestCap.${key} must be a positive integer`,
    );
  }
  for (const key of [
    "tierPrefix",
    "behaviorChange",
    "decisionAccepted",
    "overridePrefix",
  ]) {
    expect(
      typeof policy?.labels?.[key] === "string",
      `labels.${key} must be a string`,
    );
  }
  expect(
    isStringArray(policy?.labels?.overrideSignals),
    "labels.overrideSignals must be a string array",
  );
  expect(
    typeof policy?.reviewTierCheck?.name === "string" &&
      (policy.reviewTierCheck.integrationId === null ||
        isPositiveInteger(policy.reviewTierCheck.integrationId)),
    "reviewTierCheck needs a name and a null or integer integrationId",
  );
  expect(
    policy?.reviewTierCheck?.mode === "shadow" ||
      (policy?.reviewTierCheck?.mode === "enforce" &&
        policy.reviewTierCheck.integrationId !== null),
    'reviewTierCheck.mode must be "shadow", or "enforce" with an integrationId',
  );
  expect(
    Array.isArray(policy?.requiredChecks) &&
      policy.requiredChecks.every(
        (check) =>
          typeof check.context === "string" &&
          isPositiveInteger(check.integrationId),
      ),
    "requiredChecks entries need a context and an integrationId",
  );
  expect(
    typeof policy?.mergeQueue?.enabled === "boolean" &&
      typeof policy.mergeQueue.parameters === "object" &&
      policy.mergeQueue.parameters !== null,
    "mergeQueue needs a boolean enabled and a parameters object",
  );

  if (problems.length > 0) {
    throw new Error(`Invalid review policy:\n- ${problems.join("\n- ")}`);
  }
  return policy;
}

export function loadReviewPolicy(root) {
  return validateReviewPolicy(
    JSON.parse(readFileSync(path.join(root, REVIEW_POLICY_PATH), "utf8")),
  );
}

export function matchesAny(file, patterns) {
  return patterns.some((pattern) => path.posix.matchesGlob(file, pattern));
}

export function areasOf(policy, file) {
  return policy.areas.filter(
    (area) =>
      matchesAny(file, area.paths) || matchesAny(file, area.contractDocs),
  );
}

export const isDecisionPath = (policy, file) =>
  matchesAny(file, policy.decisionPaths);
export const isLowRiskPath = (policy, file) =>
  matchesAny(file, policy.lowRiskPaths);
export const isTestPath = (policy, file) => matchesAny(file, policy.testPaths);
export const isGeneratedPath = (policy, file) =>
  matchesAny(file, policy.generatedPaths);

export function parseTitleType(policy, title) {
  if (/^Revert "/.test(title)) return "revert";
  const type = /^(\w+)(?:\([^)]*\))?!?: \S/.exec(title)?.[1];
  return type && policy.types.includes(type) ? type : null;
}

export const tierLabel = (policy, tier) => `${policy.labels.tierPrefix}${tier}`;

export function overrideSignal(policy, labelName) {
  const { overridePrefix, overrideSignals } = policy.labels;
  if (!labelName.startsWith(overridePrefix)) return null;
  const signal = labelName.slice(overridePrefix.length).trim();
  return overrideSignals.includes(signal) ? signal : null;
}
