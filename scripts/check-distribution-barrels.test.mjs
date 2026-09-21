import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectBarrelParity,
  findParityGaps,
  runCheck,
} from "./check-distribution-barrels.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const script = path.join(repoRoot, "scripts/check-distribution-barrels.mjs");

function createWorkspace(packages) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-distribution-barrels-"));
  for (const [dir, { name, exports, files }] of Object.entries(packages)) {
    const packageDir = path.join(root, "packages", dir);
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      path.join(packageDir, "package.json"),
      JSON.stringify({ name, version: "1.0.0", exports }),
    );
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(packageDir, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, source);
    }
  }
  return root;
}

const entry = (file) => ({ types: `./dist/${file}.d.ts`, default: "./x.js" });

function createFixture(names = {}) {
  const core = names.core ?? "@fixture/core";
  const web = names.web ?? "@fixture/web";
  const native = names.native ?? "@fixture/native";
  return createWorkspace({
    core: {
      name: core,
      exports: {
        ".": entry("index"),
        "./react": entry("react/index"),
        "./untyped": { types: null, default: "./dist/untyped.js" },
      },
      files: {
        "src/index.ts": [
          "export const helper = () => 1;",
          "export type Options = { a: number };",
          "export const legacy = 2;",
          "export const nested = 3;",
          "",
        ].join("\n"),
        "src/react/index.ts": [
          "export const Provider = () => null;",
          'export { helper } from "../index";',
          "",
        ].join("\n"),
      },
    },
    web: {
      name: web,
      exports: { ".": entry("index") },
      files: {
        "src/index.ts": [
          `export { helper, type Options, legacy } from "${core}";`,
          `export { Provider } from "${core}/react";`,
          'export * from "./local";',
          "export const own = 1;",
          "",
        ].join("\n"),
        "src/local.ts": `export { nested } from "${core}";\n`,
      },
    },
    native: {
      name: native,
      exports: { ".": entry("index") },
      files: {
        "src/index.ts": [
          `export { helper } from "${core}";`,
          `export type { Provider } from "${core}/react";`,
          "export const legacy = 3;",
          `export { helper as unstable_helper } from "${core}";`,
          "",
        ].join("\n"),
      },
    },
  });
}

const fixtureOptions = (root) => ({
  root,
  distributions: ["@fixture/web", "@fixture/native"],
  sharedPackages: ["@fixture/core"],
});

function gapKeys(gaps) {
  return gaps
    .map((gap) => `${gap.distribution} ${gap.kind} ${gap.entry.name}`)
    .sort();
}

test("collects every shared symbol a distribution re-exports, with its public specifiers", () => {
  const root = createFixture();
  try {
    const parity = collectBarrelParity(fixtureOptions(root));
    const byName = Object.fromEntries(parity.entries.map((e) => [e.name, e]));

    assert.deepEqual(Object.keys(byName).sort(), [
      "Options",
      "Provider",
      "helper",
      "legacy",
      "nested",
      "unstable_helper",
    ]);
    assert.deepEqual(byName.helper.exportedBy, {
      "@fixture/web": true,
      "@fixture/native": true,
    });
    assert.deepEqual(byName.helper.via, [
      { specifier: "@fixture/core", name: "helper" },
      { specifier: "@fixture/core/react", name: "helper" },
    ]);
    assert.deepEqual(byName.Options.exportedBy, { "@fixture/web": false });
    assert.deepEqual(byName.Provider.exportedBy, {
      "@fixture/web": true,
      "@fixture/native": false,
    });
    assert.deepEqual(byName.nested.exportedBy, { "@fixture/web": true });
    assert.deepEqual(byName.unstable_helper.via, [
      { specifier: "@fixture/core", name: "helper" },
      { specifier: "@fixture/core/react", name: "helper" },
    ]);
    assert.deepEqual(byName.legacy.exportedBy, { "@fixture/web": true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports a missing name, a type-only downgrade, an own symbol under a shared name and an alias only one side carries", () => {
  const root = createFixture();
  try {
    const { gaps, staleExceptions } = findParityGaps(
      collectBarrelParity(fixtureOptions(root)),
      [],
    );
    assert.deepEqual(gapKeys(gaps), [
      "@fixture/native missing Options",
      "@fixture/native missing legacy",
      "@fixture/native missing nested",
      "@fixture/native type-only Provider",
      "@fixture/web missing unstable_helper",
    ]);
    assert.deepEqual(staleExceptions, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an exception hides a missing name and is reported once nothing needs it", () => {
  const root = createFixture();
  try {
    const parity = collectBarrelParity(fixtureOptions(root));
    const { gaps, staleExceptions } = findParityGaps(parity, [
      {
        names: ["legacy", "helper"],
        missingFrom: ["@fixture/native"],
        reason: "native ships its own",
      },
      {
        names: ["Provider"],
        missingFrom: ["@fixture/native"],
        reason: "a type-only export is not a missing one",
      },
    ]);
    assert.deepEqual(gapKeys(gaps), [
      "@fixture/native missing Options",
      "@fixture/native missing nested",
      "@fixture/native type-only Provider",
      "@fixture/web missing unstable_helper",
    ]);
    assert.deepEqual(
      staleExceptions.map(
        ({ distribution, name }) => `${distribution} ${name}`,
      ),
      ["@fixture/native helper", "@fixture/native Provider"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a shared package import that does not resolve into its src fails the run", () => {
  const root = createFixture();
  try {
    writeFileSync(
      path.join(root, "packages/native/src/index.ts"),
      'export { helper } from "@fixture/core";\nexport { deep } from "@fixture/core/deep";\n',
    );
    assert.throws(
      () => collectBarrelParity(fixtureOptions(root)),
      /packages\/native\/src\/index\.ts imports "@fixture\/core\/deep", which resolves to nothing/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runCheck applies the exceptions it is given", () => {
  const root = createFixture();
  try {
    const result = runCheck({
      ...fixtureOptions(root),
      exceptions: [
        {
          names: ["Options", "legacy", "nested"],
          missingFrom: ["@fixture/native"],
          reason: "fixture",
        },
        {
          names: ["unstable_helper"],
          missingFrom: ["@fixture/web"],
          reason: "fixture",
        },
      ],
    });
    assert.equal(result.entryCount, 6);
    assert.deepEqual(gapKeys(result.gaps), [
      "@fixture/native type-only Provider",
    ]);
    assert.deepEqual(result.staleExceptions, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the command fails on a workspace whose barrels disagree", () => {
  const root = createFixture({
    core: "@assistant-ui/core",
    web: "@assistant-ui/react",
    native: "@assistant-ui/react-native",
  });
  for (const [dir, name] of [
    ["react-ink", "@assistant-ui/react-ink"],
    ["store", "@assistant-ui/store"],
    ["tap", "@assistant-ui/tap"],
  ]) {
    const packageDir = path.join(root, "packages", dir);
    mkdirSync(path.join(packageDir, "src"), { recursive: true });
    writeFileSync(
      path.join(packageDir, "package.json"),
      JSON.stringify({
        name,
        version: "1.0.0",
        exports: { ".": entry("index") },
      }),
    );
    writeFileSync(path.join(packageDir, "src/index.ts"), "export {};\n");
  }
  try {
    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, DISTRIBUTION_BARREL_CHECK_ROOT: root },
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /@assistant-ui\/react-ink\n\s+is missing helper from @assistant-ui\/core, @assistant-ui\/core\/react; exported by @assistant-ui\/react, @assistant-ui\/react-native/,
    );
    assert.match(
      result.stderr,
      /@assistant-ui\/react-native\n(.*\n)*\s+exports only the type of a value that its siblings export Provider/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the command passes on this repository", () => {
  const result = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(
    result.stdout,
    /^Every distribution re-exports the same shared surface\. \(\d+ shared exports checked across 3 barrels\)/,
  );
});
