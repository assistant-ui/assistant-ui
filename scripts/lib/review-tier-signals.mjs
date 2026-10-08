import {
  areasOf,
  isDecisionPath,
  isGeneratedPath,
  isLowRiskPath,
  isTestPath,
  matchesAny,
  parseTitleType,
} from "./review-policy.mjs";

function majorOf(range) {
  const major = /^[\s^~>=v]*(\d+)/.exec(range)?.[1];
  return major === undefined ? null : Number(major);
}

export function computeTier(input, policy) {
  const type = parseTitleType(policy, input.title);
  const reasons = new Map();
  const failures = [];
  const areas = new Set();
  const packages = new Set();
  let sourceLines = 0;

  const addReason = (tier, code, detail) => {
    const reason = { tier, code, detail };
    reasons.set(JSON.stringify(reason), reason);
  };
  const addApiReason = (tier, code, detail) => {
    addReason(tier, code, detail);
    areas.add("public-api");
  };
  const isSourcePath = (file) =>
    !isTestPath(policy, file) &&
    !isGeneratedPath(policy, file) &&
    !isLowRiskPath(policy, file);

  for (const file of input.files) {
    const paths = [file.path];
    if (file.status === "renamed" && file.previousPath) {
      paths.push(file.previousPath);
    }
    for (const path of paths) {
      const fileAreas = areasOf(policy, path);
      if (isDecisionPath(policy, path)) {
        addReason(3, "decision-path", path);
      } else if (fileAreas.length > 0) {
        const code = fileAreas.some((area) => matchesAny(path, area.paths))
          ? "contract-area"
          : "contract-docs";
        addReason(2, code, path);
      } else if (isLowRiskPath(policy, path)) {
        addReason(0, "low-risk-path", path);
      } else if (isTestPath(policy, path)) {
        addReason(
          file.deletions === 0 ? 0 : 1,
          file.deletions === 0 ? "test-addition" : "test-change",
          path,
        );
      } else {
        addReason(1, "source", path);
      }
      for (const area of fileAreas) areas.add(area.id);
    }

    if (isSourcePath(file.path)) {
      sourceLines += file.additions + file.deletions;
      const packageName = /^packages\/([^/]+)\//.exec(file.path)?.[1];
      if (packageName) packages.add(packageName);
    }

    if (
      file.status === "added" &&
      matchesAny(file.path, ["packages/*/package.json"])
    ) {
      addReason(3, "new-package", file.path);
    }

    const lines = file.patch?.split("\n") ?? [];
    const added = lines.filter(
      (line) => line.startsWith("+") && !line.startsWith("+++"),
    );
    const removed = lines.filter(
      (line) => line.startsWith("-") && !line.startsWith("---"),
    );
    if (
      file.path.startsWith("packages/") &&
      !isTestPath(policy, file.path) &&
      added.some((line) => line.includes("@deprecated"))
    ) {
      addApiReason(2, "deprecation", file.path);
    }
    if (
      file.path.startsWith(".github/workflows/") &&
      [...added, ...removed].some((line) => /permissions:|secrets\./.test(line))
    ) {
      addReason(3, "ci-permissions", file.path);
    }
    if (
      type === "refactor" &&
      isTestPath(policy, file.path) &&
      removed.some((line) => /\b(expect|assert)\b/.test(line))
    ) {
      failures.push({
        code: "refactor-changes-assertions",
        detail: file.path,
        override: "type",
      });
    }
  }

  if (input.files.length === 0) addReason(1, "no-files", "No changed files");
  if (input.labels.includes(policy.labels.behaviorChange)) {
    addReason(3, "behavior-change-label", policy.labels.behaviorChange);
  }

  for (const { file, diff } of input.apiSurface) {
    for (const entry of diff.entriesAdded) {
      addApiReason(3, "entry-point-added", `${file}: ${entry}`);
    }
    for (const entry of diff.entriesRemoved) {
      addApiReason(3, "entry-point-removed", `${file}: ${entry}`);
    }
    for (const [entry, names] of Object.entries(diff.exportsRemoved)) {
      for (const name of names) {
        addApiReason(3, "export-removed", `${file}: ${entry} ${name}`);
      }
    }
    for (const { entry, name } of diff.declarationsChanged) {
      addApiReason(2, "declaration-changed", `${file}: ${entry} ${name}`);
    }
    for (const [entry, names] of Object.entries(diff.exportsAdded)) {
      for (const name of names) {
        addApiReason(2, "export-added", `${file}: ${entry} ${name}`);
      }
    }
    if (type === "refactor" && diff.changed) {
      failures.push({
        code: "refactor-changes-api",
        detail: file,
        override: "type",
      });
    }
  }

  for (const { path, diff } of input.exportsDiffs) {
    for (const entry of diff.added) {
      addApiReason(3, "entry-point-added", `${path}: ${entry}`);
    }
    for (const entry of diff.removed) {
      addApiReason(3, "entry-point-removed", `${path}: ${entry}`);
    }
    for (const entry of diff.changed) {
      addApiReason(2, "exports-map-changed", `${path}: ${entry}`);
    }
    if (type === "refactor") {
      failures.push({
        code: "refactor-changes-exports",
        detail: path,
        override: "type",
      });
    }
  }

  for (const { path, base, head } of input.manifests) {
    if (
      !matchesAny(path, ["packages/*/package.json"]) ||
      base === null ||
      head === null
    ) {
      continue;
    }
    for (const name of Object.keys(head.dependencies ?? {})) {
      if (!Object.hasOwn(base.dependencies ?? {}, name)) {
        addReason(3, "new-runtime-dependency", `${path}: ${name}`);
      }
    }
    let peerHead = head.peerDependencies;
    for (const field of ["dependencies", "peerDependencies"]) {
      for (const [name, range] of Object.entries(head[field] ?? {})) {
        if (!Object.hasOwn(base[field] ?? {}, name)) continue;
        const baseMajor = majorOf(base[field][name]);
        const headMajor = majorOf(range);
        if (
          baseMajor !== null &&
          headMajor !== null &&
          baseMajor !== headMajor
        ) {
          addReason(3, "upstream-major", `${path}: ${field}.${name}`);
          if (field === "peerDependencies") {
            peerHead = { ...peerHead, [name]: base[field][name] };
          }
        }
      }
    }
    for (const field of ["peerDependencies", "engines", "sideEffects", "bin"]) {
      const headValue = field === "peerDependencies" ? peerHead : head[field];
      if (JSON.stringify(base[field]) !== JSON.stringify(headValue)) {
        addApiReason(2, "manifest-contract-field", `${path}: ${field}`);
      }
    }
  }

  if (type === null) {
    failures.push({
      code: "unknown-type",
      detail: input.title,
      override: null,
    });
  }
  if (type === "refactor" && packages.size >= 2) {
    addReason(
      3,
      "cross-package-refactor",
      [...packages].map((name) => `packages/${name}`).join(", "),
    );
  }

  const resultReasons = [...reasons.values()];
  const tier = resultReasons.reduce(
    (highest, reason) => Math.max(highest, reason.tier),
    0,
  );
  if (
    policy.sizeCap.tiers.includes(tier) &&
    sourceLines > policy.sizeCap.sourceLines
  ) {
    failures.push({
      code: "size-cap",
      detail: `${sourceLines} source lines exceed the ${policy.sizeCap.sourceLines} line cap`,
      override: "size",
    });
  }

  return {
    tier,
    type,
    areas: policy.areas
      .filter((area) => areas.has(area.id))
      .map((area) => area.id),
    reasons: resultReasons,
    failures,
    sourceLines,
  };
}
