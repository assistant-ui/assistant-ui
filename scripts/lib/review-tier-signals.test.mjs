import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadReviewPolicy } from "./review-policy.mjs";
import { computeTier } from "./review-tier-signals.mjs";

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
  ["packages/tap/README.md", 0, 2, "contract-area", ["reactivity"]],
  ["apps/docs/content/docs/tap/x.mdx", 0, 2, "contract-docs", ["reactivity"]],
  ["CONTRIBUTING.md", 0, 2, "contract-area", ["ci-policy"]],
  [".changeset/quiet-fixes.md", 0, 0, "low-risk-path", []],
  ["packages/react/src/index.ts", 2, 1, "source", []],
  ["packages/react/src/index.test.ts", 0, 0, "test-addition", []],
  ["packages/react/src/index.test.ts", 1, 1, "test-change", []],
  ["packages/tap/src/index.test.ts", 0, 2, "contract-area", ["reactivity"]],
  ["apps/demo/index.test.ts", 1, 0, "low-risk-path", []],
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

for (const [path, status] of [
  ["packages/widget/package.json", "modified"],
  ["packages/widget/package.json", "removed"],
  ["packages/widget/package.json", "renamed"],
  ["packages/widget/fixture/package.json", "added"],
  ["apps/widget/package.json", "added"],
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
  [">=1.0.0 || ^2.0.0", ">=1.2.0 || ^3.0.0"],
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
