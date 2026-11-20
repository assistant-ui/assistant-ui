import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadReviewPolicy } from "./review-policy.mjs";
import { computeTier, pathsAboveT0 } from "./review-tier-signals.mjs";

const policy = loadReviewPolicy(path.resolve(import.meta.dirname, "../.."));

const file = (path, overrides = {}) => ({
  path,
  status: "modified",
  additions: 1,
  deletions: 0,
  ...overrides,
});
const input = (overrides = {}) => ({
  title: "fix: update the implementation",
  labels: [],
  files: [],
  apiSurface: [],
  exportsDiffs: [],
  manifests: [],
  invalidManifests: [],
  ...overrides,
});
const apiDiff = (overrides = {}) => ({
  entriesAdded: [],
  entriesRemoved: [],
  exportsAdded: {},
  exportsRemoved: {},
  declarationsChanged: [],
  changed: false,
  ...overrides,
});
const exportsDiff = (overrides = {}) => ({
  added: [],
  removed: [],
  changed: [],
  ...overrides,
});
const manifestInput = (base, head, path = "packages/react/package.json") =>
  input({
    files: [file(path)],
    manifests: [{ path, base, head }],
  });

for (const [path, deletions, tier, code, areas] of [
  [".github/review-policy.json", 0, 3, "decision-path", ["ci-policy"]],
  [".npmrc", 0, 3, "decision-path", []],
  ["apps/docs/.npmrc", 0, 3, "decision-path", []],
  ["examples/demo/.npmrc", 0, 3, "decision-path", []],
  ["templates/minimal/.npmrc", 0, 3, "decision-path", []],
  ["packages/react/.npmrc", 0, 3, "decision-path", []],
  ["packages/tap/.npmrc", 0, 3, "decision-path", ["reactivity"]],
  [".config/pnpm/.npmrc", 0, 3, "decision-path", []],
  ["packages/tap/README.md", 0, 2, "contract-area", ["reactivity"]],
  ["apps/docs/content/docs/tap/x.mdx", 0, 2, "contract-docs", ["reactivity"]],
  ["CONTRIBUTING.md", 0, 2, "contract-area", ["ci-policy"]],
  ["AGENTS.md", 0, 2, "contract-area", ["ci-policy"]],
  ["packages/AGENTS.md", 0, 0, "low-risk-path", []],
  ["apps/docs/AGENTS.md", 0, 0, "low-risk-path", []],
  [".changeset/quiet-fixes.md", 0, 0, "low-risk-path", []],
  ["packages/react/src/index.ts", 2, 1, "source", []],
  ["packages/react/src/index.test.ts", 0, 0, "test-addition", []],
  ["packages/react/src/index.test.ts", 1, 1, "test-change", []],
  ["packages/tap/src/index.test.ts", 0, 2, "contract-area", ["reactivity"]],
  ["apps/demo/index.test.ts", 1, 0, "low-risk-path", []],
  [
    "apps/docs/public/downloads/assistant-ui-wizard-login-ea9aae48e.tgz",
    0,
    2,
    "contract-area",
    ["ci-policy"],
  ],
  ["packages/tap/vendor/harness.tar", 0, 2, "contract-area", ["reactivity"]],
  ["templates/minimal/vendor/sdk-1.0.0.tgz", 0, 3, "unowned-archive", []],
  ["examples/demo/assets/bundle.tar", 0, 3, "unowned-archive", []],
  ["unowned/vendor/archive.TAR.GZ", 0, 3, "unowned-archive", []],
  ["packages/react/vendor/lib.tgz", 0, 3, "unowned-archive", []],
]) {
  test(`${path} with ${deletions} deletions uses ${code}`, () => {
    const result = computeTier(
      input({ files: [file(path, { deletions })] }),
      policy,
    );
    assert.equal(result.tier, tier);
    assert.deepEqual(result.reasons, [{ tier, code, detail: path }]);
    assert.deepEqual(result.areas, areas);
    assert.deepEqual(result.failures, []);
  });
}

test("a pull request without files has the complete T1 output shape", () => {
  assert.deepEqual(computeTier(input(), policy), {
    tier: 1,
    type: "fix",
    areas: [],
    ownedPackages: [],
    reasons: [{ tier: 1, code: "no-files", detail: "No changed files" }],
    failures: [],
    sourceLines: 0,
  });
});

test("a rename retains the previous path's contract area and counts lines once", () => {
  const result = computeTier(
    input({
      files: [
        file("packages/react/src/moved.ts", {
          status: "renamed",
          previousPath: "packages/tap/src/original.ts",
          additions: 7,
          deletions: 5,
        }),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 2);
  assert.deepEqual(result.areas, ["reactivity"]);
  assert.deepEqual(result.reasons, [
    { tier: 1, code: "source", detail: "packages/react/src/moved.ts" },
    { tier: 2, code: "contract-area", detail: "packages/tap/src/original.ts" },
  ]);
  assert.equal(result.sourceLines, 12);
});

test("a renamed decision path retains T3", () => {
  const result = computeTier(
    input({
      files: [
        file("archive/policy.json", {
          status: "renamed",
          previousPath: ".github/review-policy.json",
        }),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(result.areas, ["ci-policy"]);
  assert.ok(result.reasons.some((reason) => reason.code === "decision-path"));
});

test("previousPath only participates in renames", () => {
  const result = computeTier(
    input({
      files: [
        file("README.md", { previousPath: ".github/review-policy.json" }),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 0);
  assert.deepEqual(result.areas, []);
});

test("the configured behavior change label gives T3", () => {
  const customPolicy = {
    ...policy,
    labels: { ...policy.labels, behaviorChange: "behavior: changed" },
  };
  const result = computeTier(
    input({
      files: [file("README.md")],
      labels: ["behavior: changed"],
    }),
    customPolicy,
  );
  assert.equal(result.tier, 3);
  assert.ok(
    result.reasons.some((reason) => reason.code === "behavior-change-label"),
  );
  assert.equal(
    computeTier(
      input({
        files: [file("README.md")],
        labels: ["behavior-change"],
      }),
      customPolicy,
    ).tier,
    0,
  );
});

test("an added package manifest gives T3", () => {
  const result = computeTier(
    input({
      files: [file("packages/widget/package.json", { status: "added" })],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.ok(
    result.reasons.some(
      (reason) =>
        reason.code === "new-package" &&
        reason.detail === "packages/widget/package.json",
    ),
  );
});

test("a package manifest renamed from another directory introduces a package", () => {
  const result = computeTier(
    input({
      files: [
        file("packages/gadget/package.json", {
          status: "renamed",
          previousPath: "packages/widget/package.json",
        }),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.ok(
    result.reasons.some(
      (reason) =>
        reason.code === "new-package" &&
        reason.detail === "packages/gadget/package.json",
    ),
  );
});

for (const [path, status] of [
  ["packages/widget/package.json", "modified"],
  ["packages/widget/package.json", "removed"],
  ["packages/widget/package.json", "renamed"],
  ["packages/widget/fixture/package.json", "added"],
  ["apps/widget/package.json", "added"],
  ["packages/.cache/package.json", "added"],
]) {
  test(`${status} ${path} does not introduce a package`, () => {
    const result = computeTier(
      input({ files: [file(path, { status })] }),
      policy,
    );
    assert.ok(!result.reasons.some((reason) => reason.code === "new-package"));
  });
}

for (const [change, tier, code, detail] of [
  [{ entriesAdded: ["./new"] }, 3, "entry-point-added", "./new"],
  [{ entriesRemoved: ["./old"] }, 3, "entry-point-removed", "./old"],
  [
    { exportsRemoved: { ".": ["oldExport"] } },
    3,
    "export-removed",
    ". oldExport",
  ],
  [
    { declarationsChanged: [{ entry: ".", name: "Widget" }] },
    2,
    "declaration-changed",
    ". Widget",
  ],
  [{ exportsAdded: { ".": ["newExport"] } }, 2, "export-added", ". newExport"],
]) {
  test(`API surfaces report ${code}`, () => {
    const file = "api-surface/assistant-ui__react.ts";
    const result = computeTier(
      input({
        apiSurface: [{ file, diff: apiDiff({ ...change, changed: true }) }],
      }),
      policy,
    );
    assert.equal(result.tier, tier);
    assert.deepEqual(result.areas, ["public-api"]);
    assert.ok(
      result.reasons.some(
        (reason) =>
          reason.tier === tier &&
          reason.code === code &&
          reason.detail === `${file}: ${detail}`,
      ),
    );
    assert.deepEqual(result.failures, []);
  });
}

for (const [field, tier, code] of [
  ["added", 3, "entry-point-added"],
  ["removed", 3, "entry-point-removed"],
  ["changed", 2, "exports-map-changed"],
]) {
  test(`exports maps report ${code}`, () => {
    const path = "packages/react/package.json";
    const result = computeTier(
      input({
        exportsDiffs: [{ path, diff: exportsDiff({ [field]: ["./client"] }) }],
      }),
      policy,
    );
    assert.equal(result.tier, tier);
    assert.deepEqual(result.areas, ["public-api"]);
    assert.ok(
      result.reasons.some(
        (reason) =>
          reason.tier === tier &&
          reason.code === code &&
          reason.detail === `${path}: ./client`,
      ),
    );
  });
}

test("empty API and exports diffs add no public API signals", () => {
  const result = computeTier(
    input({
      apiSurface: [
        { file: "api-surface/assistant-ui__react.ts", diff: apiDiff() },
      ],
      exportsDiffs: [
        { path: "packages/react/package.json", diff: exportsDiff() },
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 1);
  assert.deepEqual(result.areas, []);
  assert.equal(result.reasons.length, 1);
});

test("a newly added runtime dependency gives T3 even without a base dependencies field", () => {
  const result = computeTier(
    manifestInput({}, { dependencies: { library: "workspace:*" } }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.ok(
    result.reasons.some(
      (reason) =>
        reason.code === "new-runtime-dependency" &&
        reason.detail.includes("packages/react/package.json: library"),
    ),
  );
  assert.deepEqual(result.areas, []);
});

for (const field of ["peerDependencies", "optionalDependencies"]) {
  test(`a new ${field} entry gives T3`, () => {
    const result = computeTier(
      manifestInput({}, { [field]: { library: "^1.0.0" } }),
      policy,
    );
    assert.equal(result.tier, 3);
    assert.ok(
      result.reasons.some(
        (reason) =>
          reason.code === "new-runtime-dependency" &&
          reason.detail === "packages/react/package.json: library",
      ),
    );
  });
  for (const baseField of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    test(`${field} entry already in base ${baseField} is not new`, () => {
      const result = computeTier(
        manifestInput(
          { [baseField]: { library: "^1.0.0" } },
          { [field]: { library: "^1.0.0" } },
        ),
        policy,
      );
      assert.ok(
        !result.reasons.some(
          (reason) => reason.code === "new-runtime-dependency",
        ),
      );
    });
  }
}

test("invalid package manifests add non-waivable failures", () => {
  const paths = ["packages/react/package.json", "packages/core/package.json"];
  const result = computeTier(input({ invalidManifests: paths }), policy);
  assert.deepEqual(
    result.failures,
    paths.map((path) => ({
      code: "manifest-invalid",
      detail: path,
      override: null,
    })),
  );
});

for (const field of ["dependencies", "peerDependencies"]) {
  for (const prefix of ["", "^", "~", ">=", ">", "=", "v", ">= v"]) {
    test(`${field} detects an upstream major with prefix ${JSON.stringify(prefix)}`, () => {
      const result = computeTier(
        manifestInput(
          { [field]: { library: `${prefix}1.2.3` } },
          { [field]: { library: `${prefix}2.0.0` } },
        ),
        policy,
      );
      assert.equal(result.tier, 3);
      assert.deepEqual(
        result.reasons.filter((reason) => reason.code === "upstream-major"),
        [
          {
            tier: 3,
            code: "upstream-major",
            detail: `packages/react/package.json: ${field}.library`,
          },
        ],
      );
      assert.ok(
        !result.reasons.some(
          (reason) => reason.code === "manifest-contract-field",
        ),
      );
    });
  }
}

for (const [base, head] of [
  ["workspace:^1.0.0", "workspace:^2.0.0"],
  ["workspace:^1.0.0", "^2.0.0"],
  ["^1.0.0", "workspace:^2.0.0"],
  ["latest", "^2.0.0"],
  ["^1.0.0", "*"],
  ["^1.0.0", "^1.9.0"],
  [">=1.0.0 || ^2.0.0", "^2.1.0 || >=1.2.0"],
]) {
  test(`runtime range ${base} to ${head} does not signal an upstream major`, () => {
    const result = computeTier(
      manifestInput(
        { dependencies: { library: base } },
        { dependencies: { library: head } },
      ),
      policy,
    );
    assert.equal(result.tier, 1);
    assert.ok(
      !result.reasons.some((reason) => reason.code === "upstream-major"),
    );
  });
}

for (const [base, head] of [
  [">=1.0.0 || ^2.0.0", ">=1.2.0 || ^3.0.0"],
  ["^1.0.0 || ^2.0.0", "^1.0.0 || ^2.0.0 || ^3.0.0"],
  ["^1.0.0 || ^2.0.0", "^2.0.0"],
]) {
  test(`peer range ${base} to ${head} signals an upstream major`, () => {
    const result = computeTier(
      manifestInput(
        { peerDependencies: { library: base } },
        { peerDependencies: { library: head } },
      ),
      policy,
    );
    assert.ok(
      result.reasons.some((reason) => reason.code === "upstream-major"),
    );
  });
}

test("a refactor whose test patch is unavailable fails closed", () => {
  const result = computeTier(
    input({
      title: "refactor(react): tidy",
      files: [
        file("packages/react/src/index.test.ts", { patch: null, deletions: 3 }),
      ],
    }),
    policy,
  );
  assert.ok(
    result.failures.some(
      (failure) => failure.code === "refactor-changes-assertions",
    ),
  );
});

test("reordering manifest contract fields is not a contract change", () => {
  const result = computeTier(
    manifestInput(
      {
        peerDependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        engines: { node: ">=24", pnpm: ">=10" },
      },
      {
        peerDependencies: { "react-dom": "^19.0.0", react: "^19.0.0" },
        engines: { pnpm: ">=10", node: ">=24" },
      },
    ),
    policy,
  );
  assert.ok(
    !result.reasons.some((reason) => reason.code === "manifest-contract-field"),
  );
});

for (const [field, baseValue, headValue] of [
  ["peerDependencies", { react: "^19.0.0" }, { react: "^19.1.0" }],
  ["peerDependencies", undefined, { react: "^19.0.0" }],
  ["peerDependencies", { react: "^19.0.0" }, undefined],
  ["engines", { node: ">=22" }, { node: ">=24" }],
  ["sideEffects", false, ["*.css"]],
  ["bin", { cli: "./old.mjs" }, { cli: "./new.mjs" }],
]) {
  test(`a contract change in ${field} adds public-api`, () => {
    const result = computeTier(
      manifestInput({ [field]: baseValue }, { [field]: headValue }),
      policy,
    );
    assert.equal(
      result.tier,
      field === "peerDependencies" && baseValue === undefined ? 3 : 2,
    );
    assert.deepEqual(result.areas, ["public-api"]);
    assert.ok(
      result.reasons.some(
        (reason) =>
          reason.code === "manifest-contract-field" &&
          reason.detail === `packages/react/package.json: ${field}`,
      ),
    );
  });
}

test("other peer changes still add public-api alongside a peer major", () => {
  const result = computeTier(
    manifestInput(
      { peerDependencies: { react: "^18.0.0", library: "^1.0.0" } },
      { peerDependencies: { react: "^19.0.0", library: "^1.1.0" } },
    ),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(result.areas, ["public-api"]);
  assert.ok(result.reasons.some((reason) => reason.code === "upstream-major"));
  assert.ok(
    result.reasons.some((reason) => reason.code === "manifest-contract-field"),
  );
});

test("JSON-identical contract fields and unrelated manifest changes add no signals", () => {
  const base = {
    peerDependencies: { react: "^19.0.0" },
    engines: { node: ">=24" },
    sideEffects: false,
    bin: { cli: "./cli.mjs" },
    dependencies: { removed: "^1.0.0" },
    devDependencies: { tool: "^1.0.0" },
  };
  const head = {
    ...structuredClone(base),
    dependencies: {},
    devDependencies: { tool: "^2.0.0" },
  };
  assert.equal(computeTier(manifestInput(base, head), policy).tier, 1);
});

for (const [path, base, head] of [
  ["apps/web/package.json", {}, { dependencies: { library: "^1" } }],
  [
    "packages/react/nested/package.json",
    {},
    { dependencies: { library: "^1" } },
  ],
  ["packages/react/package.json", null, { dependencies: { library: "^1" } }],
  ["packages/react/package.json", { dependencies: { library: "^1" } }, null],
]) {
  test(`manifest comparison requires an existing package on both sides: ${path} ${base === null} ${head === null}`, () => {
    const result = computeTier(manifestInput(base, head, path), policy);
    assert.ok(
      !result.reasons.some((reason) =>
        [
          "new-runtime-dependency",
          "upstream-major",
          "manifest-contract-field",
        ].includes(reason.code),
      ),
    );
  });
}

test("an added deprecation in package source gives T2 and public-api", () => {
  const path = "packages/react/src/index.ts";
  const result = computeTier(
    input({
      files: [
        file(path, { patch: "+/** @deprecated Use the new function. */" }),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 2);
  assert.deepEqual(result.areas, ["public-api"]);
  assert.ok(
    result.reasons.some(
      (reason) => reason.code === "deprecation" && reason.detail === path,
    ),
  );
});

for (const [path, patch] of [
  ["packages/react/src/index.test.ts", "+// @deprecated"],
  ["packages/react/src/__tests__/fixture.ts", "+// @deprecated"],
  ["apps/web/index.ts", "+// @deprecated"],
  ["packages/react/src/index.ts", "-// @deprecated"],
  ["packages/react/src/index.ts", " // @deprecated"],
  ["packages/react/src/index.ts", "+++ b/@deprecated"],
  ["packages/react/src/index.ts", undefined],
]) {
  test(`deprecation ignores ${path} with patch ${JSON.stringify(patch)}`, () => {
    const result = computeTier(
      input({ files: [file(path, { patch })] }),
      policy,
    );
    assert.ok(!result.reasons.some((reason) => reason.code === "deprecation"));
    assert.deepEqual(result.areas, []);
  });
}

for (const patch of [
  "+permissions: write-all",
  "-  permissions: read-all",
  "+  token: ${{ secrets.GITHUB_TOKEN }}",
  "-  token: ${{ secrets.DEPLOY_TOKEN }}",
  "+secrets: inherit",
  "-  contents: read\n+  contents: write",
  "+  pull_request_target:",
  "+  workflow_run:",
  "+  token: ${{ secrets['DEPLOY_TOKEN'] }}",
  "+  issue_comment:",
  "+  pull_request_review_comment:",
  "+  discussion_comment:",
  "+  repository_dispatch:",
  "+  issues:",
  "+  - discussion",
  "+on: [push, issues]",
  null,
]) {
  test(`workflow security changes give T3: ${patch}`, () => {
    const path = ".github/workflows/code-quality.yaml";
    const result = computeTier(
      input({ files: [file(path, { patch })] }),
      policy,
    );
    assert.equal(result.tier, 3);
    assert.deepEqual(result.areas, ["ci-policy"]);
    assert.ok(
      result.reasons.some(
        (reason) => reason.code === "ci-permissions" && reason.detail === path,
      ),
    );
  });
}

for (const [path, patch] of [
  [".github/actions/action.yml", "+permissions: write-all"],
  [
    ".github/workflows/code-quality.yaml",
    " permissions: write-all\n token: secrets.TOKEN",
  ],
  [
    ".github/workflows/code-quality.yaml",
    "+++ b/permissions:\n--- a/secrets.TOKEN",
  ],
  [".github/workflows/code-quality.yaml", undefined],
  [
    ".github/workflows/code-quality.yaml",
    "+        run: gh api repos/o/r/issues/1/comments",
  ],
]) {
  test(`workflow security ignores ${path} with patch ${JSON.stringify(patch)}`, () => {
    const result = computeTier(
      input({ files: [file(path, { patch })] }),
      policy,
    );
    assert.ok(
      !result.reasons.some((reason) => reason.code === "ci-permissions"),
    );
  });
}

for (const [change, patch] of [
  ["git override", " overrides:\n-  foo: ^1.2.3\n+  foo: github:someone/foo"],
  ["alias override", " overrides:\n-  foo: ^1.2.3\n+  foo: npm:fork@1.2.3"],
  [
    "escaped git shorthand in a double quoted override",
    ' overrides:\n-  foo: ^1.2.3\n+  foo: "someone\\x2ffoo"',
  ],
  [
    "unicode escaped git shorthand in a double quoted override",
    ' overrides:\n+  foo: "someone\\u002ffoo"',
  ],
  ["quoted override value", ' overrides:\n+  foo: "^1.2.4"'],
  ["single quoted override value", " overrides:\n+  'foo': '^1.2.4'"],
  ["double quoted override key and value", ' overrides:\n+  "foo": "^1.2.4"'],
  [
    "escaped double quoted override key",
    ' overrides:\n+  "@scope\\x2ffoo": ^1.2.4',
  ],
  [
    "backslash in a single quoted override key",
    " overrides:\n+  '@scope\\foo': ^1.2.4",
  ],
  ["backslash in an unquoted override key", " overrides:\n+  foo\\bar: ^1.2.4"],
  ["mismatched override key quotes", " overrides:\n+  'foo\": ^1.2.4"],
  ["flow override value", " overrides:\n+  foo: {bar: ^1.2.4}"],
  ["flow override entry", " overrides:\n+  {foo: ^1.2.4}"],
  ["single pipe override", " overrides:\n+  foo: ^1.2.3 | ^2.0.0"],
  ["metadata override", " overrides:\n+  foo: 1.2.3+build.1"],
  ["unknown section exact item", " futureInstallPolicy:\n+  - foo@1.2.3"],
  ["packages exact item", " packages:\n+  - foo@1.2.3"],
  ["overrides exact item", " overrides:\n+  - foo@1.2.3"],
  ["allowBuilds exact item", " allowBuilds:\n+  - foo@1.2.3"],
  [
    "tagged build permission",
    " allowBuilds:\n-  foo@1.2.3: true\n+  foo@latest: true",
  ],
  [
    "ranged build permission",
    " allowBuilds:\n-  foo@1.2.3: true\n+  foo@^1.2.4: true",
  ],
  [
    "non-exact previous build permission",
    " allowBuilds:\n-  foo@latest: true\n+  foo@1.2.4: true",
  ],
  ["new versioned blocked build", " allowBuilds:\n+  foo@1.2.3: false"],
  ["removed exact build permission", " allowBuilds:\n-  foo@1.2.3: true"],
  [
    "removed multiple exact build permissions",
    " allowBuilds:\n-  foo@1.2.3: true\n-  foo@1.2.4: true",
  ],
  [
    "multiple added build permissions for one removed version",
    " allowBuilds:\n-  foo@1.2.3: true\n+  foo@1.2.4: true\n+  foo@1.2.5: true",
  ],
  [
    "multiple removed build permissions for one added version",
    " allowBuilds:\n-  foo@1.2.3: true\n-  foo@1.2.4: true\n+  foo@1.2.5: true",
  ],
  [
    "swapped build booleans across existing versions",
    " allowBuilds:\n-  foo@1.2.3: true\n-  foo@1.2.4: false\n+  foo@1.2.3: false\n+  foo@1.2.4: true",
  ],
  [
    "unchanged exact build version",
    " allowBuilds:\n-  foo@1.2.3: true\n+  foo@1.2.3: true",
  ],
  [
    "disabled build permission with a version bump",
    " allowBuilds:\n-  foo@1.2.3: true\n+  foo@1.2.4: false",
  ],
  [
    "context cannot supply a previous build version",
    " allowBuilds:\n   foo@1.2.3: true\n+  foo@1.2.4: true",
  ],
  ["build permission", " allowBuilds:\n+  foo@1.2.3: true"],
  ["unversioned build permission", " allowBuilds:\n+  foo: true"],
  ["scoped build permission", " allowBuilds:\n+  '@scope/foo@1.2.3': true"],
  ["enabled build permission", " allowBuilds:\n-  foo: false\n+  foo: true"],
  [
    "enabled build permission with a version bump",
    " allowBuilds:\n-  foo@1.2.3: false\n+  foo@1.2.4: true",
  ],
  [
    "renamed build permission",
    " allowBuilds:\n-  foo@1.2.3: true\n+  bar@1.2.3: true",
  ],
  [
    "scoped build permission with a different scope",
    " allowBuilds:\n-  @old/foo@1.2.3: true\n+  @new/foo@1.2.4: true",
  ],
  [
    "unversioned build permission widening",
    " allowBuilds:\n-  esbuild@0.27.0: true\n+  esbuild: true",
  ],
  [
    "scoped unversioned build permission widening",
    " allowBuilds:\n-  '@scope/foo@1.2.3': true\n+  '@scope/foo': true",
  ],
  [
    "escaped double quoted build key",
    ' allowBuilds:\n-  "@scope/foo@1.2.3": true\n+  "@scope\\u002ffoo@1.2.4": true',
  ],
  [
    "backslash in a single quoted build key",
    " allowBuilds:\n-  'foo@1.2.3': true\n+  'fo\\o@1.2.4': true",
  ],
  [
    "quoted build boolean",
    ' allowBuilds:\n-  "foo@1.2.3": true\n+  "foo@1.2.4": "true"',
  ],
  [
    "quoted build boolean change",
    " allowBuilds:\n-  'foo@1.2.3': false\n+  'foo@1.2.4': true",
  ],
  [
    "quoted build package change",
    ' allowBuilds:\n-  "foo@1.2.3": true\n+  "bar@1.2.4": true',
  ],
  [
    "quoted unchanged build version",
    " allowBuilds:\n-  'foo@1.2.3': true\n+  'foo@1.2.3': true",
  ],
  [
    "mismatched build key quotes",
    " allowBuilds:\n-  'foo@1.2.3': true\n+  'foo@1.2.4\": true",
  ],
  ["new overrides section", "+overrides:\n+  foo: ^1.2.4"],
  ["removed overrides section", "-overrides:\n-  foo: github:someone/foo"],
  ["new allowBuilds section", "+allowBuilds:\n+  foo: false"],
  ["removed allowBuilds section", "-allowBuilds:\n-  foo: true"],
  ["new empty overrides section", "+overrides:"],
  ["removed empty overrides section", "-overrides:"],
  ["new quoted allowBuilds section", '+"allowBuilds":'],
  ["removed quoted allowBuilds section", "-'allowBuilds':"],
  ["renamed section", "-overrides:\n+allowBuilds:"],
  [
    "sensitive list in a later hunk",
    `@@ -40,2 +40,3 @@ minimumReleaseAgeExclude:
   - foo@1.2.3
+  - bar@1.2.3
   - baz@1.2.3
@@ -80,2 +81,3 @@ futureInstallPolicy:
   - foo@1.2.3
+  - bar@1.2.3
   - baz@1.2.3`,
  ],
  ["trust policy", "-trustPolicy: no-downgrade\n+trustPolicy: off"],
  ["release age", "-minimumReleaseAge: 1440\n+minimumReleaseAge: 0"],
  ["removed trust policy", "-trustPolicy: no-downgrade"],
  [
    "trust exception pruning",
    "-trustPolicyExcludePrune: true\n+trustPolicyExcludePrune: false",
  ],
  ["strict build policy", "-strictDepBuilds: true\n+strictDepBuilds: false"],
  ["all builds allowed", "+dangerouslyAllowAllBuilds: true"],
  ["pnpmfile", "+pnpmfile: ./install.cjs"],
  ["config dependency", " configDependencies:\n+  foo: 1.2.3"],
  [
    "registry",
    "-registry: https://registry.npmjs.org/\n+registry: https://example.com/",
  ],
  ["unknown setting", "+futureInstallPolicy: false"],
  ["key resembling an added diff header", "+++futureInstallPolicy: false"],
  ["key resembling a removed diff header", "---futureInstallPolicy: false"],
  ["wildcard exception", " minimumReleaseAgeExclude:\n+  - foo@*"],
  ["unversioned exception", " minimumReleaseAgeExclude:\n+  - foo"],
  ["range exception", " minimumReleaseAgeExclude:\n+  - foo@^1.2.3"],
  ["tag exception", " minimumReleaseAgeExclude:\n+  - foo@latest"],
  [
    "range exception with a trailing comment",
    " minimumReleaseAgeExclude:\n+  - foo@^1.2.3 # Verified release",
  ],
  [
    "wildcard exception with a trailing comment",
    " minimumReleaseAgeExclude:\n+  - foo@* # Verified release",
  ],
  [
    "tag exception with a trailing comment",
    " minimumReleaseAgeExclude:\n+  - foo@latest # Verified release",
  ],
  [
    "unversioned exception with a trailing comment",
    " minimumReleaseAgeExclude:\n+  - foo # Verified release",
  ],
  [
    "hash without a comment separator",
    " minimumReleaseAgeExclude:\n+  - foo@1.2.3#verified",
  ],
  ["partial version", " minimumReleaseAgeExclude:\n+  - foo@1.2"],
  ["leading zero", " minimumReleaseAgeExclude:\n+  - foo@01.2.3"],
  ["invalid prerelease", " minimumReleaseAgeExclude:\n+  - foo@1.2.3-01"],
  ["mismatched quotes", " minimumReleaseAgeExclude:\n+  - 'foo@1.2.3\""],
  [
    "escaped double quoted exception",
    ' minimumReleaseAgeExclude:\n+  - "@scope\\x2ffoo@1.2.3"',
  ],
  [
    "unicode escaped double quoted trust exception",
    ' trustPolicyExclude:\n+  - "foo@1.2.\\u0033" # Verified release',
  ],
  [
    "backslash in a single quoted exception",
    " minimumReleaseAgeExclude:\n+  - 'fo\\o@1.2.3'",
  ],
  [
    "quoted ranged exception",
    " minimumReleaseAgeExclude:\n+  - 'foo@^1.2.3' # Verified release",
  ],
  [
    "quoted exception with a leading zero",
    ' trustPolicyExclude:\n+  - "foo@01.2.3"',
  ],
  [
    "quoted hash without a comment separator",
    ' minimumReleaseAgeExclude:\n+  - "foo@1.2.3"#verified',
  ],
  ["mixed changes", "+  - foo@1.2.3\n+minimumReleaseAge: 0"],
  ["override without a section", "+  foo: ^1.2.3"],
  [
    "build permission without a section",
    "-  foo@1.2.3: true\n+  foo@1.2.4: true",
  ],
  ["exact exception without a section", "+  - foo@1.2.3"],
  [
    "section missing in a later hunk",
    "@@ -1,2 +1,2 @@ overrides:\n-  foo: ^1.2.3\n+  foo: ^1.2.4\n@@ -20,1 +20,1 @@\n-  bar: ^1.2.3\n+  bar: ^1.2.4",
  ],
  [
    "unknown section after overrides",
    " overrides:\n+  foo: ^1.2.3\n futureInstallPolicy:\n+  bar: ^1.2.3",
  ],
  [
    "changed unknown section after overrides",
    " overrides:\n+  foo: ^1.2.3\n+futureInstallPolicy:\n+  bar: ^1.2.3",
  ],
  [
    "quoted unknown section after overrides",
    " overrides:\n+  foo: ^1.2.3\n 'futureInstallPolicy':\n+  bar: ^1.2.3",
  ],
  [
    "scoped registry section after overrides",
    " overrides:\n+  foo: ^1.2.3\n @scope:registry:\n+  bar: ^1.2.3",
  ],
  [
    "unknown removed section before overrides",
    "-futureInstallPolicy:\n+overrides:\n-  foo: ^1.2.3\n+  foo: ^1.2.4",
  ],
  ["inline override mapping", "+overrides: {foo: 'github:someone/foo'}"],
  ["inline build permissions", "+allowBuilds: {foo: true}"],
  ["unparsed override", " overrides:\n+  foo:\n+    bar: github:someone/bar"],
  ["unparsed build permission", " allowBuilds:\n+  foo: *allow"],
  [
    "registry override replacing a non-registry source",
    " overrides:\n-  foo: github:someone/foo\n+  foo: ^1.2.4",
  ],
  [
    "alias range bump",
    " overrides:\n-  foo: npm:fork@^1.2.3\n+  foo: npm:fork@^1.2.4",
  ],
  [
    "scoped alias range bump",
    " overrides:\n-  foo: 'npm:@scope/fork@^1.2.3'\n+  foo: 'npm:@scope/fork@^1.2.4'",
  ],
  ["new blocked build", " allowBuilds:\n+  foo: false"],
  ["removed build permission", " allowBuilds:\n-  foo: true"],
  ["revoked build permission", " allowBuilds:\n-  foo: true\n+  foo: false"],
  [
    "existing unversioned build permission",
    " allowBuilds:\n-  foo: true\n+  foo: true # Reviewed",
  ],
  [
    "narrowed build permission",
    " allowBuilds:\n-  foo: true\n+  foo@1.2.3: true",
  ],
  [
    "multiple existing build permission versions",
    " allowBuilds:\n-  foo@1.2.3: true\n-  foo@1.2.4: false\n+  foo@1.2.5: true",
  ],
  ["override comment without a space", " overrides:\n+  foo: ^1.2.4#Reviewed"],
  ["unavailable patch", null],
]) {
  test(`workspace install policy changes give T3: ${change}`, () => {
    const path = "pnpm-workspace.yaml";
    const result = computeTier(
      input({ files: [file(path, { patch })] }),
      policy,
    );
    assert.equal(result.tier, 3);
    assert.deepEqual(
      result.reasons.filter(({ code }) => code === "install-policy"),
      [{ tier: 3, code: "install-policy", detail: path }],
    );
  });
}

for (const [change, patch] of [
  ["registry override", " overrides:\n-  foo: ^1.2.3\n+  foo: ^1.2.4"],
  ["new registry override", " overrides:\n+  foo: 1.2.4"],
  ["removed registry override", " overrides:\n-  foo: ^1.2.3"],
  ["unquoted scoped override", " overrides:\n+  @scope/foo: ~1.2.4"],
  ["single quoted override key", " overrides:\n+  'foo': ^1.2.4"],
  ["double quoted scoped override key", ' overrides:\n+  "@scope/foo": ^1.2.4'],
  [
    "single quoted override selector",
    " overrides:\n-  'undici@<5.29.0': ^5.28.0\n+  'undici@<5.29.0': ^5.29.0",
  ],
  [
    "double quoted override selector",
    ' overrides:\n+  "undici@>=5.0.0 <5.29.0": ^5.29.0',
  ],
  [
    "registry override with a parent selector",
    " overrides:\n+  '@scope/parent>foo': ^1.2.4",
  ],
  ["unquoted parent selector", " overrides:\n+  guarded-fetch>undici: ^7.30.1"],
  ["wildcard registry override", " overrides:\n+  foo: *"],
  ["partial registry override", " overrides:\n+  foo: 1.2.x"],
  ["prerelease registry override", " overrides:\n+  foo: ^1.2.3-beta.1"],
  ["comparator registry override", " overrides:\n+  foo: >=1.2.3 <2.0.0"],
  ["hyphen registry override", " overrides:\n+  foo: 1.2.3 - 2.0.0"],
  ["union registry override", " overrides:\n+  foo: ^1.2.3 || ~2.0.0"],
  ["major registry override", " overrides:\n-  foo: ^1.2.3\n+  foo: ^2.0.0"],
  [
    "registry override from a hunk header",
    "@@ -20,1 +20,1 @@ overrides:\n-  foo: ^1.2.3\n+  foo: ^1.2.4",
  ],
  ["quoted overrides section", ' "overrides":\n+    foo: ^1.2.4'],
  [
    "build permission version bump",
    " allowBuilds:\n-  foo@1.2.3: true\n+  foo@1.2.4: true",
  ],
  [
    "unquoted scoped build permission version bump",
    " allowBuilds:\n-  @scope/foo@1.2.3: true\n+  @scope/foo@1.2.4: true",
  ],
  [
    "single quoted build permission version bump",
    " allowBuilds:\n-  'foo@1.2.3': true\n+  'foo@1.2.4': true",
  ],
  [
    "double quoted scoped build permission version bump",
    ' allowBuilds:\n-  "@scope/foo@1.2.3": true\n+  "@scope/foo@1.2.4": true',
  ],
  [
    "build version bump with different key quotes",
    " allowBuilds:\n-  'foo@1.2.3': false\n+  \"foo@1.2.4\": false",
  ],
  [
    "build version bump from an unquoted to a quoted key",
    " allowBuilds:\n-  foo@1.2.3: true\n+  'foo@1.2.4': true",
  ],
  [
    "blocked build version bump",
    " allowBuilds:\n-  foo@1.2.3: false\n+  foo@1.2.4: false",
  ],
  [
    "exact prerelease build version bump",
    " allowBuilds:\n-  foo@1.2.3-rc.1: true\n+  foo@1.2.3-rc.2: true",
  ],
  [
    "build version bump across hunks with additions first",
    "@@ -20,1 +20,2 @@ allowBuilds:\n   bar@1.2.3: true\n+  foo@1.2.4: true\n@@ -30,2 +31,1 @@ allowBuilds:\n   baz@1.2.3: true\n-  foo@1.2.3: true",
  ],
  [
    "multiple matching build version bumps",
    " allowBuilds:\n-  foo@1.2.3: true\n-  foo@1.2.4: false\n+  foo@1.2.5: true\n+  foo@1.2.6: false",
  ],
  [
    "build permission version bump from a hunk header",
    "@@ -20,1 +20,1 @@ allowBuilds:\n-  foo@1.2.3: true\n+  foo@1.2.4: true",
  ],
  [
    "overrides and build permissions in the same hunk",
    " overrides:\n-  foo: ^1.2.3\n+  foo: ^1.2.4\n allowBuilds:\n-  bar@1.2.3: true\n+  bar@1.2.4: true",
  ],
  ["exact exception", " minimumReleaseAgeExclude:\n+  - foo@1.2.3"],
  ["indentless exact exception", " minimumReleaseAgeExclude:\n+- foo@1.2.3"],
  ["scoped exception", " minimumReleaseAgeExclude:\n+  - @scope/foo@1.2.3"],
  ["trust exception", " trustPolicyExclude:\n+  - @scope/foo@1.2.3"],
  ["quoted scoped exception", " trustPolicyExclude:\n+  - '@scope/foo@1.2.3'"],
  ["double quoted exception", ' minimumReleaseAgeExclude:\n+  - "foo@1.2.3"'],
  [
    "quoted scoped exception with a trailing comment",
    " trustPolicyExclude:\n+  - '@scope/foo@1.2.3' # Verified release",
  ],
  [
    "double quoted exception with a trailing comment",
    ' minimumReleaseAgeExclude:\n+  - "foo@1.2.3" # Verified release',
  ],
  [
    "removed double quoted trust exception with prerelease and metadata",
    ' trustPolicyExclude:\n-  - "@scope/foo@1.2.3-rc.1+build.007" # Verified release',
  ],
  [
    "removed trust exception with a comment",
    " trustPolicyExclude:\n-  - @scope/foo@1.2.3 # Verified release",
  ],
  ["prerelease exception", " minimumReleaseAgeExclude:\n+  - foo@1.2.3-rc.1"],
  ["build metadata", " minimumReleaseAgeExclude:\n+  - foo@1.2.3+build.007"],
  ["removed exception", " minimumReleaseAgeExclude:\n-  - foo@1.2.3"],
  [
    "exact exception with a trailing comment",
    " minimumReleaseAgeExclude:\n+  - foo@1.2.3 # Verified release",
  ],
  [
    "prerelease exception with a trailing comment",
    " minimumReleaseAgeExclude:\n+  - foo@1.2.3-rc.1+build.007 # Verified release",
  ],
  [
    "removed exception with a trailing comment",
    " minimumReleaseAgeExclude:\n-  - foo@1.2.3 # Verified release",
  ],
  ["comments", "-# Old comment\n+# New comment\n+  # Indented comment"],
  ["blank lines", "+\n-  "],
  [
    "diff headers and context",
    "--- a/pnpm-workspace.yaml\n+++ b/pnpm-workspace.yaml\n@@ -1,2 +1,3 @@\n minimumReleaseAge: 1440\n minimumReleaseAgeExclude:\n+  - foo@1.2.3",
  ],
  ["commented override", " overrides:\n+  foo: ^1.2.4 # Reviewed"],
  [
    "registry override with an advisory comment",
    " overrides:\n+  'foo@>=1.0.0 <1.2.4': ^1.2.4 # https://example.com/advisory",
  ],
  [
    "build permission version bump with a comment",
    " allowBuilds:\n-  foo@1.2.3: true # Reviewed\n+  foo@1.2.4: true # Reviewed",
  ],
]) {
  test(`workspace install policy exemptions stay T1: ${change}`, () => {
    const result = computeTier(
      input({ files: [file("pnpm-workspace.yaml", { patch })] }),
      policy,
    );
    assert.equal(result.tier, 1);
    assert.deepEqual(result.reasons, [
      { tier: 1, code: "source", detail: "pnpm-workspace.yaml" },
    ]);
  });
}

for (const [base, head] of [
  ["^1.2.3", "latest"],
  ["^1.2.3", '"^1.2.4"'],
  ["^1.2.3", "workspace:*"],
  ["^1.2.3", "catalog:"],
  ["^1.2.3", "file:../foo"],
  ["^1.2.3", "link:../foo"],
  ["^1.2.3", "github:someone/foo"],
  ["^1.2.3", "git+https://example.com/foo.git"],
  ["^1.2.3", "ssh://git@example.com/foo.git"],
  ["^1.2.3", "git@example.com:someone/foo.git"],
  ["^1.2.3", "https://example.com/foo.tgz"],
  ["^1.2.3", "someone/foo#main"],
  ["^1.2.3", "npm:@scope/fork@^1.2.3"],
  ["npm:fork@^1.2.3", "npm:other@^1.2.4"],
  ["github:someone/foo#main", "github:someone/foo#next"],
  ["github:someone/foo#main", '"github:someone/foo#main"'],
]) {
  test(`workspace override source ${base} to ${head} gives T3`, () => {
    const path = "pnpm-workspace.yaml";
    const patch = ` overrides:\n-  foo: ${base}\n+  foo: ${head}`;
    const result = computeTier(
      input({ files: [file(path, { patch })] }),
      policy,
    );
    assert.equal(result.tier, 3);
    assert.deepEqual(
      result.reasons.filter(({ code }) => code === "install-policy"),
      [{ tier: 3, code: "install-policy", detail: path }],
    );
  });
}

for (const [commit, tier, patch] of [
  [
    "f0dda8646 (PR #10642 files API)",
    1,
    `@@ -22,9 +22,9 @@ overrides:
   '@earendil-works/pi-coding-agent>undici': ^8.12.2
   guarded-fetch>undici: ^7.30.1
   miniflare>undici: ^7.30.1
-  '@modelcontextprotocol/client@>=2.0.0 <2.3.0': ^2.3.0 # aui-sec: CVE-2026-104850, CVE-2026-111769
-  '@modelcontextprotocol/sdk@>=1.0.0 <1.32.0': ^1.32.0 # aui-sec: CVE-2026-104850, CVE-2026-111767, CVE-2026-111768, CVE-2026-111769, CVE-2026-111771, GHSA-F897-62HF-6GXQ
-  '@modelcontextprotocol/server@>=2.0.0 <2.3.0': ^2.3.0 # aui-sec: CVE-2026-111768, CVE-2026-111770, CVE-2026-111771, GHSA-F897-62HF-6GXQ
+  '@modelcontextprotocol/client@>=2.0.0 <2.2.0': ^2.2.0 # aui-sec: CVE-2026-104850
+  '@modelcontextprotocol/sdk@>=1.0.0 <1.32.0': ^1.32.0 # aui-sec: CVE-2026-104850, CVE-2026-111767, GHSA-F897-62HF-6GXQ
+  '@modelcontextprotocol/server@>=2.0.0 <2.1.0': ^2.1.0 # aui-sec: GHSA-F897-62HF-6GXQ
   'ajv@>=8.0.0 <8.18.0': ^8.18.0 # aui-sec: CVE-2025-69873
   'fflate@>=0.7.0 <0.7.5': ^0.7.5 # aui-sec: CVE-2026-45820
   'js-yaml@>=4.0.0 <4.3.2': ^4.3.2 # aui-sec: CVE-2026-53550, CVE-2026-59869, CVE-2026-84375, GHSA-5P4M-2WFM-XMQJ
`,
  ],
  [
    "f0dda8646",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index 3794f9bad..56c982f73 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -22,9 +22,9 @@ overrides:
   '@earendil-works/pi-coding-agent>undici': ^8.12.2
   guarded-fetch>undici: ^7.30.1
   miniflare>undici: ^7.30.1
-  '@modelcontextprotocol/client@>=2.0.0 <2.3.0': ^2.3.0 # aui-sec: CVE-2026-104850, CVE-2026-111769
-  '@modelcontextprotocol/sdk@>=1.0.0 <1.32.0': ^1.32.0 # aui-sec: CVE-2026-104850, CVE-2026-111767, CVE-2026-111768, CVE-2026-111769, CVE-2026-111771, GHSA-F897-62HF-6GXQ
-  '@modelcontextprotocol/server@>=2.0.0 <2.3.0': ^2.3.0 # aui-sec: CVE-2026-111768, CVE-2026-111770, CVE-2026-111771, GHSA-F897-62HF-6GXQ
+  '@modelcontextprotocol/client@>=2.0.0 <2.2.0': ^2.2.0 # aui-sec: CVE-2026-104850
+  '@modelcontextprotocol/sdk@>=1.0.0 <1.32.0': ^1.32.0 # aui-sec: CVE-2026-104850, CVE-2026-111767, GHSA-F897-62HF-6GXQ
+  '@modelcontextprotocol/server@>=2.0.0 <2.1.0': ^2.1.0 # aui-sec: GHSA-F897-62HF-6GXQ
   'ajv@>=8.0.0 <8.18.0': ^8.18.0 # aui-sec: CVE-2025-69873
   'fflate@>=0.7.0 <0.7.5': ^0.7.5 # aui-sec: CVE-2026-45820
   'js-yaml@>=4.0.0 <4.3.2': ^4.3.2 # aui-sec: CVE-2026-53550, CVE-2026-59869, CVE-2026-84375, GHSA-5P4M-2WFM-XMQJ
`,
  ],
  [
    "294e932db",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index 48777b82b..3794f9bad 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -27,11 +27,11 @@ overrides:
   '@modelcontextprotocol/server@>=2.0.0 <2.3.0': ^2.3.0 # aui-sec: CVE-2026-111768, CVE-2026-111770, CVE-2026-111771, GHSA-F897-62HF-6GXQ
   'ajv@>=8.0.0 <8.18.0': ^8.18.0 # aui-sec: CVE-2025-69873
   'fflate@>=0.7.0 <0.7.5': ^0.7.5 # aui-sec: CVE-2026-45820
-  'js-yaml@>=4.0.0 <4.3.2': ^4.3.2 # aui-sec: CVE-2026-53550, CVE-2026-59869, CVE-2026-84375
+  'js-yaml@>=4.0.0 <4.3.2': ^4.3.2 # aui-sec: CVE-2026-53550, CVE-2026-59869, CVE-2026-84375, GHSA-5P4M-2WFM-XMQJ
   'minimatch@>=10.0.0 <10.2.3': ^10.2.3 # aui-sec: CVE-2026-26996, CVE-2026-27903, CVE-2026-27904
-  'path-to-regexp@>=6.0.0 <6.3.0': ^6.3.0 # aui-sec: CVE-2024-45296, CVE-2026-4867
+  'path-to-regexp@>=6.0.0 <6.3.0': ^6.3.0 # aui-sec: CVE-2024-45296
   'path-to-regexp@>=8.0.0 <8.4.0': ^8.4.0 # aui-sec: CVE-2026-4923, CVE-2026-4926
-  'smol-toml@>=1.0.0 <1.7.1': ^1.7.1 # aui-sec: CVE-2026-85730
+  'smol-toml@>=1.0.0 <1.9.0': ^1.9.0 # aui-sec: CVE-2026-85730, GHSA-R4XH-JQRQ-34V2, GHSA-V3RJ-XJV7-4JMQ
   'undici@>=5.0.0 <5.29.0': ^5.29.0 # aui-sec: CVE-2025-22150, CVE-2025-47279
   'undici@>=7.0.0 <7.30.1': ^7.30.1 # aui-sec: CVE-2026-109383, CVE-2026-109829, CVE-2026-109841, CVE-2026-109869, CVE-2026-109924, CVE-2026-109932, CVE-2026-87018
   'undici@>=8.0.0 <8.12.2': ^8.12.2 # aui-sec: CVE-2026-109383, CVE-2026-109829, CVE-2026-109841, CVE-2026-109869, CVE-2026-109924, CVE-2026-109932, CVE-2026-87018
`,
  ],
  [
    "104d140f4",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index d6cc10d7a..48777b82b 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -22,6 +22,19 @@ overrides:
   '@earendil-works/pi-coding-agent>undici': ^8.12.2
   guarded-fetch>undici: ^7.30.1
   miniflare>undici: ^7.30.1
+  '@modelcontextprotocol/client@>=2.0.0 <2.3.0': ^2.3.0 # aui-sec: CVE-2026-104850, CVE-2026-111769
+  '@modelcontextprotocol/sdk@>=1.0.0 <1.32.0': ^1.32.0 # aui-sec: CVE-2026-104850, CVE-2026-111767, CVE-2026-111768, CVE-2026-111769, CVE-2026-111771, GHSA-F897-62HF-6GXQ
+  '@modelcontextprotocol/server@>=2.0.0 <2.3.0': ^2.3.0 # aui-sec: CVE-2026-111768, CVE-2026-111770, CVE-2026-111771, GHSA-F897-62HF-6GXQ
+  'ajv@>=8.0.0 <8.18.0': ^8.18.0 # aui-sec: CVE-2025-69873
+  'fflate@>=0.7.0 <0.7.5': ^0.7.5 # aui-sec: CVE-2026-45820
+  'js-yaml@>=4.0.0 <4.3.2': ^4.3.2 # aui-sec: CVE-2026-53550, CVE-2026-59869, CVE-2026-84375
+  'minimatch@>=10.0.0 <10.2.3': ^10.2.3 # aui-sec: CVE-2026-26996, CVE-2026-27903, CVE-2026-27904
+  'path-to-regexp@>=6.0.0 <6.3.0': ^6.3.0 # aui-sec: CVE-2024-45296, CVE-2026-4867
+  'path-to-regexp@>=8.0.0 <8.4.0': ^8.4.0 # aui-sec: CVE-2026-4923, CVE-2026-4926
+  'smol-toml@>=1.0.0 <1.7.1': ^1.7.1 # aui-sec: CVE-2026-85730
+  'undici@>=5.0.0 <5.29.0': ^5.29.0 # aui-sec: CVE-2025-22150, CVE-2025-47279
+  'undici@>=7.0.0 <7.30.1': ^7.30.1 # aui-sec: CVE-2026-109383, CVE-2026-109829, CVE-2026-109841, CVE-2026-109869, CVE-2026-109924, CVE-2026-109932, CVE-2026-87018
+  'undici@>=8.0.0 <8.12.2': ^8.12.2 # aui-sec: CVE-2026-109383, CVE-2026-109829, CVE-2026-109841, CVE-2026-109869, CVE-2026-109924, CVE-2026-109932, CVE-2026-87018
\x20
 verifyDepsBeforeRun: install
\x20
`,
  ],
  [
    "1cc7137f4",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index 7e5589633..d6cc10d7a 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -16,6 +16,9 @@ strictDepBuilds: true
 overrides:
   '@google/adk>adm-zip': ^0.6.1
   '@vercel/container>tar': ^7.5.22
+  # @lhci/cli 0.15.1, the latest release, bundles Lighthouse 12.6.1, which returned no performance score (NO_LCP) on current Chrome.
+  '@lhci/cli>lighthouse': ^13.5.0
+  '@lhci/utils>lighthouse': ^13.5.0
   '@earendil-works/pi-coding-agent>undici': ^8.12.2
   guarded-fetch>undici: ^7.30.1
   miniflare>undici: ^7.30.1
@@ -142,6 +145,7 @@ trustPolicyExclude:
   - '@vercel/vc-native-win32-x64@65.2.0'
   - babel-preset-expo@57.0.16
   - chokidar@4.0.3
+  - chromium-bidi@157.0.8090-0
   - expo-asset@57.0.20
   - expo-constants@57.0.22
   - expo-image-manipulator@57.0.21
`,
  ],
  [
    "819231606",
    3,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index 6d3f37faa..7e5589633 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -80,6 +80,85 @@ minimumReleaseAgeExclude:
   - tw-shimmer
   - typescript
\x20
+# Fail the install when a package loses the trusted publishing or provenance it used to have.
+trustPolicy: no-downgrade
+# Exact releases the policy flags, each checked on the registry before trusting it.
+trustPolicyExclude:
+  - '@expo/cli@57.0.32'
+  - '@expo/config-plugins@57.0.11'
+  - '@expo/config@57.0.10'
+  - '@expo/fingerprint@0.20.14'
+  - '@expo/image-utils@0.11.6'
+  - '@expo/inline-modules@0.1.8'
+  - '@expo/local-build-cache-provider@57.0.9'
+  - '@expo/metro-config@57.0.13'
+  - '@expo/metro-file-map@57.0.4'
+  - '@expo/metro-runtime@57.0.17'
+  - '@expo/prebuild-config@57.0.19'
+  - '@expo/require-utils@57.0.6'
+  - '@expo/router-server@57.0.14'
+  - '@expo/ui@57.0.26'
+  - '@flue/react@2.3.0'
+  - '@flue/runtime@2.3.0'
+  - '@flue/sdk@2.3.0'
+  - '@flue/vite@2.3.0'
+  - '@pierre/theme@2.0.0'
+  - '@vercel/backends@22.0.1'
+  - '@vercel/build-utils@15.0.1'
+  - '@vercel/cervel@0.1.87'
+  - '@vercel/cli-auth@0.3.12'
+  - '@vercel/cli-config@0.3.1'
+  - '@vercel/cli-config@0.3.3'
+  - '@vercel/cli-exec@1.0.1'
+  - '@vercel/container@22.0.1'
+  - '@vercel/detect-agent@1.2.7'
+  - '@vercel/elysia@22.0.1'
+  - '@vercel/error-utils@2.2.1'
+  - '@vercel/express@22.0.1'
+  - '@vercel/fastify@22.0.1'
+  - '@vercel/gatsby-plugin-vercel-analytics@1.0.12'
+  - '@vercel/gatsby-plugin-vercel-builder@2.2.79'
+  - '@vercel/go@25.0.1'
+  - '@vercel/h3@22.0.1'
+  - '@vercel/hono@22.0.1'
+  - '@vercel/hydrogen@23.0.1'
+  - '@vercel/koa@22.0.1'
+  - '@vercel/nestjs@22.0.1'
+  - '@vercel/next@26.0.1'
+  - '@vercel/node@27.0.1'
+  - '@vercel/oidc@3.8.10'
+  - '@vercel/python-analysis@0.15.2'
+  - '@vercel/python@28.0.1'
+  - '@vercel/redwood@24.0.1'
+  - '@vercel/remix-builder@27.0.1'
+  - '@vercel/ruby@24.0.1'
+  - '@vercel/rust@23.0.1'
+  - '@vercel/static-build@24.0.1'
+  - '@vercel/static-config@3.4.4'
+  - '@vercel/vc-native-darwin-arm64@65.2.0'
+  - '@vercel/vc-native-darwin-x64@65.2.0'
+  - '@vercel/vc-native-linux-arm64@65.2.0'
+  - '@vercel/vc-native-linux-x64@65.2.0'
+  - '@vercel/vc-native-win32-x64@65.2.0'
+  - babel-preset-expo@57.0.16
+  - chokidar@4.0.3
+  - expo-asset@57.0.20
+  - expo-constants@57.0.22
+  - expo-image-manipulator@57.0.21
+  - expo-linking@57.0.13
+  - expo-modules-autolinking@57.0.16
+  - expo-modules-core@57.0.24
+  - expo-modules-jsi@57.1.3
+  - expo-router@57.0.29
+  - expo-splash-screen@57.0.10
+  - expo@57.0.31
+  - semver@6.3.1
+  - ua-parser-js@1.0.41
+  - undici@5.29.0
+  - vercel@65.2.0
+# Drop entries on add, update and remove once the locked version is gone.
+trustPolicyExcludePrune: true
+
 allowBuilds:
   '@clerk/shared': false
   '@google/genai': false
`,
  ],
  [
    "e1e7ea39d",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index dbad6baa8..6d3f37faa 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -37,6 +37,9 @@ minimumReleaseAgeExclude:
   - '@farming-labs/docs@0.2.137'
   - '@farming-labs/theme@0.2.137'
   - '@farming-labs/next@0.2.137'
+  - '@farming-labs/docs@0.2.141'
+  - '@farming-labs/theme@0.2.141'
+  - '@farming-labs/next@0.2.141'
   - '@lexical/a11y@0.53.0'
   - '@lexical/clipboard@0.53.0'
   - '@lexical/code-core@0.53.0'
`,
  ],
  [
    "f451b5978",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index bf6a520bf..dbad6baa8 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -34,8 +34,9 @@ update:
 # Release age is a verification gate: review fresh releases, then add narrowly scoped, exact-version exceptions when justified.
 minimumReleaseAge: 1440
 minimumReleaseAgeExclude:
-  - '@farming-labs/docs@0.2.127'
-  - '@farming-labs/theme@0.2.127'
+  - '@farming-labs/docs@0.2.137'
+  - '@farming-labs/theme@0.2.137'
+  - '@farming-labs/next@0.2.137'
   - '@lexical/a11y@0.53.0'
   - '@lexical/clipboard@0.53.0'
   - '@lexical/code-core@0.53.0'
`,
  ],
  [
    "36ab8fdec",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index a3c05a739..bf6a520bf 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -36,6 +36,30 @@ minimumReleaseAge: 1440
 minimumReleaseAgeExclude:
   - '@farming-labs/docs@0.2.127'
   - '@farming-labs/theme@0.2.127'
+  - '@lexical/a11y@0.53.0'
+  - '@lexical/clipboard@0.53.0'
+  - '@lexical/code-core@0.53.0'
+  - '@lexical/devtools-core@0.53.0'
+  - '@lexical/dragon@0.53.0'
+  - '@lexical/extension@0.53.0'
+  - '@lexical/hashtag@0.53.0'
+  - '@lexical/history@0.53.0'
+  - '@lexical/html@0.53.0'
+  - '@lexical/internal@0.53.0'
+  - '@lexical/link@0.53.0'
+  - '@lexical/list@0.53.0'
+  - '@lexical/mark@0.53.0'
+  - '@lexical/markdown@0.53.0'
+  - '@lexical/overflow@0.53.0'
+  - '@lexical/plain-text@0.53.0'
+  - '@lexical/react@0.53.0'
+  - '@lexical/rich-text@0.53.0'
+  - '@lexical/selection@0.53.0'
+  - '@lexical/table@0.53.0'
+  - '@lexical/text@0.53.0'
+  - '@lexical/utils@0.53.0'
+  - '@lexical/yjs@0.53.0'
+  - 'lexical@0.53.0'
   - '@assistant-ui/*'
   - '@next/*'
   - '@openuidev/assistant-ui'
`,
  ],
  [
    "8e4a46935",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index c7f0fad88..a3c05a739 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -69,4 +69,4 @@ allowBuilds:
   react-grab: false
   ssh2: false
   vue-demi: false
-  workerd@1.20261012.1: true
+  workerd@1.20261019.1: true
`,
  ],
  [
    "d56b46509",
    1,
    `diff --git a/pnpm-workspace.yaml b/pnpm-workspace.yaml
index 0ad59b376..c7f0fad88 100644
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -16,6 +16,9 @@ strictDepBuilds: true
 overrides:
   '@google/adk>adm-zip': ^0.6.1
   '@vercel/container>tar': ^7.5.22
+  '@earendil-works/pi-coding-agent>undici': ^8.12.2
+  guarded-fetch>undici: ^7.30.1
+  miniflare>undici: ^7.30.1
\x20
 verifyDepsBeforeRun: install
\x20
`,
  ],
]) {
  test(`workspace install policy replay ${commit} stays T${tier}`, () => {
    const path = "pnpm-workspace.yaml";
    const result = computeTier(
      input({ files: [file(path, { patch })] }),
      policy,
    );
    assert.equal(result.tier, tier);
    assert.deepEqual(
      result.reasons.filter(({ code }) => code === "install-policy"),
      tier === 3 ? [{ tier, code: "install-policy", detail: path }] : [],
    );
  });
}

for (const [path, previousPath] of [
  ["pnpm-workspace.yaml", "workspace.yaml"],
  ["workspace.yaml", "pnpm-workspace.yaml"],
]) {
  for (const patch of [
    "+allowBuilds:\n+  foo@1.2.3: true",
    " overrides:\n-  foo: ^1.2.3\n+  foo: ^1.2.4",
    " minimumReleaseAgeExclude:\n+  - foo@1.2.3",
    "-# Old comment\n+# New comment",
    "",
    null,
  ]) {
    test(`a workspace install policy rename from ${previousPath} to ${path} gives T3: ${patch}`, () => {
      const result = computeTier(
        input({
          files: [file(path, { status: "renamed", previousPath, patch })],
        }),
        policy,
      );
      assert.equal(result.tier, 3);
      assert.deepEqual(
        result.reasons.filter(({ code }) => code === "install-policy"),
        [{ tier: 3, code: "install-policy", detail: path }],
      );
    });
  }
}

for (const patch of [
  "-# Workspace settings",
  "@@ -1,1 +0,0 @@ minimumReleaseAgeExclude:\n-  - foo@1.2.3 # Verified release",
  "",
  null,
]) {
  test(`removing the root workspace file gives T3: ${patch}`, () => {
    const path = "pnpm-workspace.yaml";
    const result = computeTier(
      input({ files: [file(path, { status: "removed", patch })] }),
      policy,
    );
    assert.equal(result.tier, 3);
    assert.deepEqual(
      result.reasons.filter(({ code }) => code === "install-policy"),
      [{ tier: 3, code: "install-policy", detail: path }],
    );
  });
}

test("workspace install policy signals apply to a nested workspace file", () => {
  const path = "templates/minimal/pnpm-workspace.yaml";
  const result = computeTier(
    input({
      files: [file(path, { patch: "+registry: https://evil.example/" })],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(
    result.reasons.filter(({ code }) => code === "install-policy"),
    [{ tier: 3, code: "install-policy", detail: path }],
  );
});

test("an unknown title type adds a failure without an override", () => {
  const result = computeTier(
    input({ title: "update the implementation" }),
    policy,
  );
  assert.equal(result.type, null);
  assert.equal(result.tier, 1);
  assert.deepEqual(result.failures, [
    {
      code: "unknown-type",
      detail: "update the implementation",
      override: null,
    },
  ]);
});

test("a GitHub revert title is parsed through the policy helper", () => {
  const result = computeTier(
    input({ title: 'Revert "fix(tap): flush tasks"' }),
    policy,
  );
  assert.equal(result.type, "revert");
  assert.deepEqual(result.failures, []);
});

test("a refactor with a changed API surface requires a type override", () => {
  const file = "api-surface/assistant-ui__react.ts";
  const result = computeTier(
    input({
      title: "refactor: simplify the implementation",
      apiSurface: [{ file, diff: apiDiff({ changed: true }) }],
    }),
    policy,
  );
  assert.deepEqual(result.failures, [
    { code: "refactor-changes-api", detail: file, override: "type" },
  ]);
});

test("a refactor with unchanged API surfaces has no type failure", () => {
  const result = computeTier(
    input({
      title: "refactor: simplify the implementation",
      apiSurface: [
        { file: "api-surface/assistant-ui__react.ts", diff: apiDiff() },
      ],
    }),
    policy,
  );
  assert.deepEqual(result.failures, []);
});

test("a refactor with any exportsDiffs entry requires a type override", () => {
  const path = "packages/react/package.json";
  const result = computeTier(
    input({
      title: "refactor: simplify the implementation",
      exportsDiffs: [{ path, diff: exportsDiff() }],
    }),
    policy,
  );
  assert.deepEqual(result.failures, [
    { code: "refactor-changes-exports", detail: path, override: "type" },
  ]);
});

test("a refactor removing test assertions requires one type override per file", () => {
  const path = "packages/react/src/index.test.ts";
  const result = computeTier(
    input({
      title: "refactor: simplify the implementation",
      files: [
        file(path, {
          deletions: 2,
          patch: "-expect(value).toBe(1);\n-assert.equal(value, 1);",
        }),
      ],
    }),
    policy,
  );
  assert.deepEqual(result.failures, [
    { code: "refactor-changes-assertions", detail: path, override: "type" },
  ]);
});

for (const [path, patch] of [
  [
    "packages/react/src/index.test.ts",
    "+expect(value).toBe(1);\n+assert.equal(value, 1);",
  ],
  ["packages/react/src/index.test.ts", " expect(value).toBe(1);"],
  ["packages/react/src/index.test.ts", "--- a/expect.ts"],
  ["packages/react/src/index.test.ts", "-expected(value);\n-assertion(value);"],
  ["packages/react/src/index.ts", "-assert.equal(value, 1);"],
]) {
  test(`refactor assertion checks ignore ${path} with patch ${JSON.stringify(patch)}`, () => {
    const result = computeTier(
      input({
        title: "refactor: simplify the implementation",
        files: [file(path, { deletions: 1, patch })],
      }),
      policy,
    );
    assert.deepEqual(result.failures, []);
  });
}

test("non-refactors can change APIs, exports maps, and assertions without type failures", () => {
  const result = computeTier(
    input({
      files: [
        file("packages/react/src/index.test.ts", {
          deletions: 1,
          patch: "-expect(value).toBe(1);",
        }),
      ],
      apiSurface: [
        {
          file: "api-surface/assistant-ui__react.ts",
          diff: apiDiff({ changed: true }),
        },
      ],
      exportsDiffs: [
        {
          path: "packages/react/package.json",
          diff: exportsDiff({ changed: ["."] }),
        },
      ],
    }),
    policy,
  );
  assert.deepEqual(result.failures, []);
});

test("a refactor spanning two source packages gives T3 and names both packages", () => {
  const result = computeTier(
    input({
      title: "refactor: share the implementation",
      files: [
        file("packages/react/src/index.ts"),
        file("packages/core/src/index.ts"),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(
    result.reasons.filter((reason) => reason.code === "cross-package-refactor"),
    [
      {
        tier: 3,
        code: "cross-package-refactor",
        detail: "packages/react, packages/core",
      },
    ],
  );
});

test("cross-package refactors exclude tests, generated files, and low-risk files", () => {
  const customPolicy = {
    ...policy,
    generatedPaths: [...policy.generatedPaths, "packages/*/generated/**"],
  };
  const result = computeTier(
    input({
      title: "refactor: simplify the implementation",
      files: [
        file("packages/react/src/index.ts"),
        file("packages/react/src/other.ts"),
        file("packages/core/src/index.test.ts"),
        file("packages/core/generated/types.ts"),
        file("packages/core/README.md"),
        file("scripts/build.mjs"),
      ],
    }),
    customPolicy,
  );
  assert.equal(result.tier, 1);
  assert.ok(
    !result.reasons.some((reason) => reason.code === "cross-package-refactor"),
  );
  assert.equal(result.sourceLines, 3);
});

test("cross-package source changes only escalate refactor titles", () => {
  const result = computeTier(
    input({
      files: [
        file("packages/react/src/index.ts"),
        file("packages/core/src/index.ts"),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 1);
});

test("sourceLines excludes test, generated, and low-risk files even inside contract areas", () => {
  const result = computeTier(
    input({
      files: [
        file("packages/tap/src/index.ts", { additions: 100, deletions: 20 }),
        file("packages/react/src/index.ts", { additions: 10, deletions: 5 }),
        ...[
          "packages/tap/src/index.test.ts",
          "packages/tap/README.md",
          "api-surface/assistant-ui__react.ts",
          "pnpm-lock.yaml",
          "apps/docs/generated/types.ts",
          "apps/web/page.tsx",
          ".changeset/change.md",
        ].map((path) => file(path, { additions: 500, deletions: 500 })),
      ],
    }),
    policy,
  );
  assert.equal(result.sourceLines, 135);
  assert.deepEqual(result.failures, []);
});

for (const [path, labels, additions, deletions, tier, fails] of [
  ["packages/tap/src/index.ts", [], 250, 150, 2, false],
  ["packages/tap/src/index.ts", [], 250, 151, 2, true],
  ["packages/react/src/index.ts", [], 500, 500, 1, false],
  ["packages/react/src/index.ts", ["behavior-change"], 250, 151, 3, true],
]) {
  test(`size cap uses final T${tier} and ${additions + deletions} source lines`, () => {
    const result = computeTier(
      input({ files: [file(path, { additions, deletions })], labels }),
      policy,
    );
    assert.equal(result.tier, tier);
    assert.equal(result.sourceLines, additions + deletions);
    assert.deepEqual(
      result.failures,
      fails
        ? [
            {
              code: "size-cap",
              detail: "401 source lines exceed the 400 line cap",
              override: "size",
            },
          ]
        : [],
    );
  });
}

test("size cap tiers and threshold come from policy", () => {
  const result = computeTier(
    input({
      files: [file("packages/react/src/index.ts", { additions: 6 })],
    }),
    { ...policy, sizeCap: { tiers: [1], sourceLines: 5 } },
  );
  assert.deepEqual(result.failures, [
    {
      code: "size-cap",
      detail: "6 source lines exceed the 5 line cap",
      override: "size",
    },
  ]);
});

test("tiers aggregate by maximum and areas follow policy order", () => {
  const result = computeTier(
    input({
      files: [
        file(".github/review-policy.json"),
        file("api-surface/assistant-ui__react.ts"),
        file("packages/assistant-stream/src/index.ts"),
        file("packages/tap/README.md"),
        file("packages/react/src/index.ts"),
        file(".changeset/change.md"),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(result.areas, [
    "reactivity",
    "protocol",
    "public-api",
    "ci-policy",
  ]);
  assert.deepEqual(
    [...new Set(result.reasons.map((reason) => reason.tier))].sort(),
    [0, 1, 2, 3],
  );
});

test("duplicate reasons collapse while different affected paths and exports remain", () => {
  const surface = {
    file: "api-surface/assistant-ui__react.ts",
    diff: apiDiff({
      exportsAdded: { ".": ["Widget", "Widget", "Other"] },
    }),
  };
  const result = computeTier(
    input({
      files: [
        file("packages/tap/src/index.ts", {
          status: "renamed",
          previousPath: "packages/tap/src/index.ts",
        }),
        file("packages/tap/src/other.ts"),
      ],
      apiSurface: [surface, surface],
    }),
    policy,
  );
  assert.equal(result.reasons.length, 4);
  assert.equal(
    result.reasons.filter((reason) => reason.code === "contract-area").length,
    2,
  );
  assert.equal(
    result.reasons.filter((reason) => reason.code === "export-added").length,
    2,
  );
  assert.deepEqual(result.areas, ["reactivity", "public-api"]);
});

test("the merged tap flush pull request is T3 without failures", () => {
  const result = computeTier(
    input({
      title: "fix(tap): a flush owns its queued tasks and notifications",
      labels: ["behavior-change"],
      files: [
        file("packages/tap/src/core/scheduler.ts", {
          additions: 35,
          deletions: 12,
        }),
        file("packages/tap/src/__tests__/scheduler.schedule-task.test.ts", {
          additions: 200,
        }),
        file("apps/docs/content/docs/tap/outside-react.mdx", {
          additions: 10,
          deletions: 2,
        }),
        file(".changeset/tap-flush-owns-queues.md", {
          status: "added",
          additions: 6,
        }),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.equal(result.type, "fix");
  assert.deepEqual(result.areas, ["reactivity"]);
  assert.deepEqual(result.failures, []);
  assert.equal(result.sourceLines, 47);
});

test("computeTier is deterministic and does not mutate its input or policy", () => {
  const freeze = (value) => {
    if (value !== null && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const request = freeze(
    input({
      title: "refactor: reorganize the implementation",
      labels: ["behavior-change"],
      files: [file("packages/react/src/index.ts", { additions: 401 })],
      apiSurface: [
        {
          file: "api-surface/assistant-ui__react.ts",
          diff: apiDiff({ entriesAdded: ["./client"], changed: true }),
        },
      ],
      exportsDiffs: [
        {
          path: "packages/react/package.json",
          diff: exportsDiff({ changed: ["."] }),
        },
      ],
      manifests: [
        {
          path: "packages/react/package.json",
          base: { peerDependencies: { react: "^18.0.0" } },
          head: { peerDependencies: { react: "^19.0.0" } },
        },
      ],
    }),
  );
  const frozenPolicy = freeze(structuredClone(policy));
  const before = structuredClone({ request, policy: frozenPolicy });
  const first = computeTier(request, frozenPolicy);
  const second = computeTier(request, frozenPolicy);
  assert.deepEqual(first, second);
  assert.deepEqual({ request, policy: frozenPolicy }, before);
});

const ownedSurface = "api-surface/assistant-ui__docs-theme.ts";
const ownedManifest = "packages/docs-theme/package.json";

test("a package's source change stays T1 with no package authority", () => {
  const result = computeTier(
    input({ files: [file("packages/docs-theme/src/a.ts")] }),
    policy,
  );
  assert.equal(result.tier, 1);
  assert.deepEqual(result.areas, []);
  assert.deepEqual(result.ownedPackages, []);
});

test("a package's API change keeps its tier and moves to the package owner", () => {
  const unchangedSurface = computeTier(
    input({ files: [file(ownedSurface)] }),
    policy,
  );
  assert.equal(unchangedSurface.tier, 2);
  assert.deepEqual(unchangedSurface.areas, []);
  assert.deepEqual(unchangedSurface.ownedPackages, ["docs-theme"]);

  const decision = computeTier(
    input({
      files: [
        file(ownedSurface),
        file(ownedManifest),
        file("packages/docs-theme/src/a.ts"),
        file("pnpm-lock.yaml"),
        file("pnpm-workspace.yaml"),
        file("api-surface/package.json"),
      ],
      apiSurface: [
        {
          file: ownedSurface,
          diff: apiDiff({
            entriesAdded: ["entry_ui"],
            exportsRemoved: { entry_root: ["Old"] },
            changed: true,
          }),
        },
      ],
      exportsDiffs: [
        { path: ownedManifest, diff: exportsDiff({ added: ["./ui"] }) },
      ],
      manifests: [
        {
          path: ownedManifest,
          base: { peerDependencies: { react: "^19" } },
          head: {
            dependencies: { motion: "^12" },
            peerDependencies: { react: "^20" },
            sideEffects: false,
          },
        },
      ],
    }),
    policy,
  );
  assert.equal(decision.tier, 3);
  assert.deepEqual(decision.areas, []);
  assert.deepEqual(decision.ownedPackages, ["docs-theme"]);
});

test("a manifest change alone moves to the package owner", () => {
  const result = computeTier(
    manifestInput({}, { dependencies: { motion: "^12" } }, ownedManifest),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(result.areas, []);
  assert.deepEqual(result.ownedPackages, ["docs-theme"]);
});

test("the private API surface harness stays T1", () => {
  for (const path of [
    "api-surface/package.json",
    "api-surface/tsconfig.json",
  ]) {
    const result = computeTier(input({ files: [file(path)] }), policy);
    assert.equal(result.tier, 1);
    assert.deepEqual(result.areas, []);
  }
});

test("a deprecation in an owned package moves to the package owner", () => {
  const result = computeTier(
    input({
      files: [
        file("packages/docs-theme/src/a.ts", {
          patch: "+ * @deprecated use b",
        }),
      ],
    }),
    policy,
  );
  assert.equal(result.tier, 2);
  assert.deepEqual(result.areas, []);
  assert.deepEqual(result.ownedPackages, ["docs-theme"]);
});

test("any signal outside the owned package withdraws package authority and restores Public API", () => {
  const owned = file(ownedSurface);
  for (const [overrides, tier, areas] of [
    [{ labels: [policy.labels.behaviorChange] }, 3, ["public-api"]],
    [
      { files: [owned, file(".github/review-policy.json")] },
      3,
      ["public-api", "ci-policy"],
    ],
    [
      { files: [owned, file("packages/tap/src/a.ts")] },
      2,
      ["reactivity", "public-api"],
    ],
    [
      { files: [owned, file("api-surface/assistant-ui__react.ts")] },
      2,
      ["public-api"],
    ],
    [
      {
        apiSurface: [
          {
            file: "api-surface/assistant-ui__react.ts",
            diff: apiDiff({ exportsAdded: { entry_root: ["New"] } }),
          },
        ],
      },
      2,
      ["public-api"],
    ],
    [
      {
        files: [owned, file("packages/react/package.json")],
        manifests: [
          {
            path: "packages/react/package.json",
            base: {},
            head: { dependencies: { motion: "^12" } },
          },
        ],
      },
      3,
      ["public-api"],
    ],
    [
      {
        title: "refactor: move code",
        files: [
          owned,
          file("packages/docs-theme/src/a.ts"),
          file("packages/react/src/a.ts"),
        ],
      },
      3,
      ["public-api"],
    ],
  ]) {
    const result = computeTier(input({ files: [owned], ...overrides }), policy);
    assert.equal(result.tier, tier);
    assert.deepEqual(result.ownedPackages, []);
    assert.deepEqual(result.areas, areas);
  }
});

test("withdrawing authority adds no Public API area to a signal with no owned API change", () => {
  const result = computeTier(
    input({
      files: [file("packages/docs-theme/src/a.ts")],
      labels: [policy.labels.behaviorChange],
    }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(result.areas, []);
  assert.deepEqual(result.ownedPackages, []);
});

test("a package owner never takes over a contract area other than Public API", () => {
  const custom = {
    ...policy,
    packageOwners: [
      { id: "tap", owners: ["alice"], paths: ["packages/tap/**"] },
    ],
  };
  const result = computeTier(
    input({ files: [file("packages/tap/src/a.ts")] }),
    custom,
  );
  assert.equal(result.tier, 2);
  assert.deepEqual(result.areas, ["reactivity"]);
  assert.deepEqual(result.ownedPackages, []);
});

test("paths above T0 skip docs, low risk paths and new test files", () => {
  assert.deepEqual(
    pathsAboveT0(
      [
        file("README.md", { patch: "+docs" }),
        file("apps/docs/content/docs/guides/x.mdx", { patch: "+docs" }),
        file(".changeset/brave-owls.md", { patch: "+x" }),
        file("apps/web/app/page.tsx", { patch: null }),
        file("packages/react/src/index.test.ts", { deletions: 0 }),
      ],
      policy,
    ),
    [],
  );
});

test("paths above T0 cover every package.json, including app and example manifests", () => {
  assert.deepEqual(
    pathsAboveT0(
      [
        file("package.json", { patch: '+    "postinstall": "node x.js",' }),
        file("apps/docs/package.json", { patch: '+    "postinstall": "x"' }),
        file("examples/with-ai-sdk-v7/package.json", { patch: "+x" }),
        file("templates/next/package.json", {
          status: "renamed",
          previousPath: "templates/old/package.json",
          patch: "",
        }),
        file("apps/docs/src/package.ts", { patch: "+x" }),
      ],
      policy,
    ),
    [
      "apps/docs/package.json",
      "examples/with-ai-sdk-v7/package.json",
      "package.json",
      "templates/next/package.json",
      "templates/old/package.json",
    ],
  );
});

test("paths above T0 is empty for an empty file list", () => {
  assert.deepEqual(pathsAboveT0([], policy), []);
});

test("paths above T0 cover source, manifests, the lockfile and root config", () => {
  const paths = [
    "packages/react/src/index.ts",
    "packages/core/src/index.ts",
    "packages/cli/src/index.ts",
    "packages/react/package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "turbo.json",
  ];
  assert.deepEqual(
    pathsAboveT0(
      paths.map((path) => file(path, { patch: "+x" })),
      policy,
    ),
    paths.toSorted(),
  );
  assert.deepEqual(
    pathsAboveT0([file("packages/react/src/b.ts", { patch: null })], policy),
    ["packages/react/src/b.ts"],
  );
});

test("paths above T0 cover a changed test file", () => {
  assert.deepEqual(
    pathsAboveT0(
      [file("packages/react/src/index.test.ts", { deletions: 2 })],
      policy,
    ),
    ["packages/react/src/index.test.ts"],
  );
});

test("paths above T0 cover owner areas, contract docs and decision paths", () => {
  assert.deepEqual(
    pathsAboveT0(
      [
        file("packages/tap/src/core/scheduler.ts", { patch: "+x" }),
        file("apps/docs/content/docs/store/index.mdx", { patch: "+x" }),
        file(".github/review-policy.json", { patch: "+x" }),
        file("scripts/lib/review-tier-signals.mjs", { patch: "+x" }),
      ],
      policy,
    ),
    [
      ".github/review-policy.json",
      "apps/docs/content/docs/store/index.mdx",
      "packages/tap/src/core/scheduler.ts",
      "scripts/lib/review-tier-signals.mjs",
    ],
  );
});

test("paths above T0 cover the public API surface", () => {
  assert.deepEqual(
    pathsAboveT0(
      [
        file("api-surface/assistant-ui__react.ts", { patch: "+x" }),
        file("packages/new-pkg/package.json", { status: "added" }),
        file("packages/react/src/a.ts", {
          patch: "@@ -1 +1 @@\n+/** @deprecated use b */",
        }),
      ],
      policy,
    ),
    [
      "api-surface/assistant-ui__react.ts",
      "packages/new-pkg/package.json",
      "packages/react/src/a.ts",
    ],
  );
});

test("a rename out of a path above T0 is reported", () => {
  assert.deepEqual(
    pathsAboveT0(
      [
        file("packages/react/src/tap.ts", {
          status: "renamed",
          previousPath: "packages/tap/src/tap.ts",
          patch: "",
        }),
      ],
      policy,
    ),
    ["packages/react/src/tap.ts", "packages/tap/src/tap.ts"],
  );
});

test("paths above T0 cover packages with their own owners", () => {
  const custom = {
    ...policy,
    packageOwners: [
      {
        id: "docs-theme",
        owners: ["someone"],
        paths: ["packages/docs-theme/**"],
      },
    ],
  };
  assert.deepEqual(
    pathsAboveT0(
      [
        file("packages/docs-theme/src/index.ts", { patch: "+const a = 1;" }),
        file("packages/react/src/theme.ts", {
          status: "renamed",
          previousPath: "packages/docs-theme/src/theme.ts",
          patch: "",
        }),
        file("apps/web/app/page.tsx", { patch: "+const a = 1;" }),
      ],
      custom,
    ),
    [
      "packages/docs-theme/src/index.ts",
      "packages/docs-theme/src/theme.ts",
      "packages/react/src/theme.ts",
    ],
  );
});

for (const patch of [
  "+          SECRETS: ${{ toJSON(secrets) }}",
  "+          VALUE: ${{ format('{0}', secrets) }}",
]) {
  test(`workflow lines that pass all secrets give T3: ${patch}`, () => {
    const path = ".github/workflows/code-quality.yaml";
    const result = computeTier(
      input({ files: [file(path, { patch })] }),
      policy,
    );
    assert.equal(result.tier, 3);
    assert.ok(
      result.reasons.some(
        (reason) => reason.code === "ci-permissions" && reason.detail === path,
      ),
    );
  });
}

test("a dot-prefixed workflow file lands in the CI and policy area", () => {
  const path = ".github/workflows/.hidden.yml";
  const result = computeTier(
    input({ files: [file(path, { patch: "+permissions: write-all" })] }),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.deepEqual(result.areas, ["ci-policy"]);
});

test("a dot-prefixed file in a contract package is a contract-area change", () => {
  const result = computeTier(
    input({ files: [file("packages/tap/.config")] }),
    policy,
  );
  assert.equal(result.tier, 2);
  assert.deepEqual(result.areas, ["reactivity"]);
});

for (const [files, changedFiles, detail] of [
  [[file("README.md")], 3001, "1 of 3001"],
  [[file("README.md")], null, "1 of an unknown number of"],
  [[file("README.md")], "1", "1 of an unknown number of"],
  [[file("README.md")], -1, "1 of an unknown number of"],
]) {
  test(`a changed-file list GitHub cut short fails: ${changedFiles}`, () => {
    const result = computeTier(input({ files, changedFiles }), policy);
    assert.deepEqual(
      result.failures.filter(({ code }) => code === "files-incomplete"),
      [{ code: "files-incomplete", detail, override: null }],
    );
  });
}

test("a complete changed-file list passes", () => {
  const result = computeTier(
    input({ files: [file("README.md")], changedFiles: 1 }),
    policy,
  );
  assert.deepEqual(result.failures, []);
  assert.equal(result.tier, 0);
});

for (const name of [
  "postinstall",
  "preinstall",
  "install",
  "prepare",
  "prepack",
  "postpack",
  "preprepare",
  "postprepare",
  "prepublish",
  "prepublishOnly",
  "publish",
  "postpublish",
  "pnpm:devPreinstall",
]) {
  for (const path of [
    "packages/react/package.json",
    "package.json",
    "apps/docs/package.json",
  ]) {
    test(`an added ${name} script in ${path} gives T3`, () => {
      const result = computeTier(
        manifestInput(
          { scripts: { build: "tsc" } },
          {
            scripts: { build: "tsc", [name]: "node x.js" },
          },
          path,
        ),
        policy,
      );
      assert.equal(result.tier, 3);
      assert.ok(
        result.reasons.some(
          (reason) =>
            reason.code === "lifecycle-script" &&
            reason.detail === `${path}: scripts.${name}`,
        ),
      );
    });
  }
}

test("a lifecycle script in a new manifest gives T3", () => {
  const path = "examples/new/package.json";
  const result = computeTier(
    manifestInput(null, { scripts: { postinstall: "node x.js" } }, path),
    policy,
  );
  assert.equal(result.tier, 3);
});

test("a changed lifecycle script gives T3", () => {
  const result = computeTier(
    manifestInput(
      { scripts: { prepare: "husky" } },
      { scripts: { prepare: "node x.js" } },
      "package.json",
    ),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.ok(
    result.reasons.some(
      (reason) =>
        reason.code === "lifecycle-script" &&
        reason.detail === "package.json: scripts.prepare",
    ),
  );
});

test("an unchanged lifecycle script or a changed build script is not flagged", () => {
  const result = computeTier(
    manifestInput(
      { scripts: { prepare: "husky", build: "tsc" } },
      { scripts: { prepare: "husky", build: "tsc -b" } },
      "package.json",
    ),
    policy,
  );
  assert.ok(!result.reasons.some(({ code }) => code === "lifecycle-script"));
});

for (const [field, base, head, key] of [
  [
    "dependencies",
    { zod: "^3.0.0" },
    { zod: "npm:zod-fork@3.0.0" },
    "dependencies.zod",
  ],
  [
    "devDependencies",
    { vitest: "^4.0.0" },
    { vitest: "npm:other@4.0.0" },
    "devDependencies.vitest",
  ],
  [
    "devDependencies",
    { a: "^1.0.0" },
    { a: "github:someone/a" },
    "devDependencies.a",
  ],
  [
    "devDependencies",
    { a: "^1.0.0" },
    { a: "https://example.com/a.tgz" },
    "devDependencies.a",
  ],
  ["overrides", {}, { b: { c: "npm:d@1.0.0" } }, "overrides.b.c"],
  [
    "devDependencies",
    { a: "^1.0.0" },
    { a: "ssh://git@github.com/someone/a.git" },
    "devDependencies.a",
  ],
  [
    "devDependencies",
    { a: "^1.0.0" },
    { a: "git@github.com:someone/a.git" },
    "devDependencies.a",
  ],
  ["dependencies", { a: "^1.0.0" }, { a: "someone/a#main" }, "dependencies.a"],
  [
    "devDependencies",
    { a: "npm:b@^1.0.0" },
    { a: "npm:c@^1.0.0" },
    "devDependencies.a",
  ],
  [
    "peerDependencies",
    { a: "^1.0.0" },
    { a: "npm:b@^1.0.0" },
    "peerDependencies.a",
  ],
  [
    "optionalDependencies",
    { a: "^1.0.0" },
    { a: "git+https://gitlab.com/someone/a.git" },
    "optionalDependencies.a",
  ],
  ["resolutions", {}, { a: "http://example.com/a.tgz" }, "resolutions.a"],
  [
    "dependencies",
    { a: "^1.0.0" },
    { a: "bitbucket:someone/a" },
    "dependencies.a",
  ],
]) {
  test(`${field} entry ${key} set to ${JSON.stringify(head)} gives T3`, () => {
    for (const path of ["packages/react/package.json", "package.json"]) {
      const result = computeTier(
        manifestInput({ [field]: base }, { [field]: head }, path),
        policy,
      );
      assert.equal(result.tier, 3);
      assert.ok(
        result.reasons.some(
          (reason) =>
            reason.code === "dependency-source" &&
            reason.detail === `${path}: ${key}`,
        ),
      );
    }
  });
}

test("an override moved between a dotted name and a nested parent gives T3", () => {
  const result = computeTier(
    manifestInput(
      { overrides: { "a.b": "npm:fork@1.0.0" } },
      { overrides: { a: { b: "npm:fork@1.0.0" } } },
      "package.json",
    ),
    policy,
  );
  assert.equal(result.tier, 3);
  assert.ok(
    result.reasons.some(
      (reason) =>
        reason.code === "dependency-source" &&
        reason.detail === "package.json: overrides.a.b",
    ),
  );
});

test("a range bump on an existing npm alias is not flagged", () => {
  const result = computeTier(
    manifestInput(
      {
        devDependencies: {
          "ai-v6": "npm:ai@^6.0.315",
          "@types/react-v18": "npm:@types/react@^18.3.31",
        },
      },
      {
        devDependencies: {
          "ai-v6": "npm:ai@^6.0.320",
          "@types/react-v18": "npm:@types/react@^18.3.32",
        },
      },
      "packages/cloud/package.json",
    ),
    policy,
  );
  assert.ok(!result.reasons.some(({ code }) => code === "dependency-source"));
});

test("an alias kept from the base and workspace or catalog specs are not flagged", () => {
  const result = computeTier(
    manifestInput(
      { devDependencies: { a: "npm:b@1.0.0", c: "^1.0.0" } },
      {
        devDependencies: { a: "npm:b@1.0.0", c: "workspace:*", d: "catalog:" },
      },
      "package.json",
    ),
    policy,
  );
  assert.ok(!result.reasons.some(({ code }) => code === "dependency-source"));
});
