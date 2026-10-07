import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { onlyInReact18, splitDiagnostics } from "./declaration-errors.mjs";
import { readsDist } from "./project.mjs";
import { react18Specifier } from "./resolve.mjs";

test("maps react and react-dom, with subpaths, to the React 18 copies", () => {
  assert.equal(react18Specifier("react"), "react-v18");
  assert.equal(react18Specifier("react/jsx-runtime"), "react-v18/jsx-runtime");
  assert.equal(react18Specifier("react-dom"), "react-dom-v18");
  assert.equal(react18Specifier("react-dom/client"), "react-dom-v18/client");
});

test("leaves every other specifier alone", () => {
  for (const specifier of [
    "react-is",
    "react-markdown",
    "@types/react",
    "preact",
  ]) {
    assert.equal(react18Specifier(specifier), null);
  }
});

test("the hook makes require and import of react and react-dom load React 18", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      fileURLToPath(new URL("./hooks.mjs", import.meta.url)),
      "--input-type=module",
      "-e",
      `import { createRequire } from "node:module";
       const require = createRequire(import.meta.url);
       const { version } = await import("react");
       const dom = await import("react-dom/server");
       console.log(version, require("react-dom").version, typeof dom.renderToString);`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^18\.\d+\.\d+ 18\.\d+\.\d+ function$/);
});

test("fails on the package's own declaration errors and only reports upstream ones", () => {
  const { own, upstream } = splitDiagnostics(
    [
      "dist/index.d.ts(1,10): error TS2305: Module '\"react\"' has no exported member 'use'.",
      "../../node_modules/.pnpm/@radix-ui+react-select@2/node_modules/@radix-ui/react-select/dist/index.d.mts(100,11): error TS2320: Interface 'A' cannot simultaneously extend types 'B' and 'C'.",
      "  Named property 'onPlaced' of types 'B' and 'C' are not identical.",
      "error TS5083: Cannot read file 'tsconfig.json'.",
      "",
    ].join("\n"),
  );
  assert.equal(own.length, 2);
  assert.match(own[0], /^dist\/index\.d\.ts/);
  assert.match(own[1], /TS5083/);
  assert.equal(upstream.length, 1);
  assert.match(upstream[0], /onPlaced/);
});

test("matches an upstream error across the versioned paths and lines of React 18's and 19's types", () => {
  const react18 = [
    "../../node_modules/.pnpm/@types+react@18.3.31/node_modules/@types/react/global.d.ts(155,11): error TS2300: Duplicate identifier 'FormData'.",
    "../../node_modules/.pnpm/lib@1/node_modules/lib/index.d.ts(3,1): error TS2305: Module '\"react\"' has no exported member 'use'.",
  ];
  const react19 = [
    "../../node_modules/.pnpm/@types+react@19.3.0/node_modules/@types/react/global.d.ts(162,11): error TS2300: Duplicate identifier 'FormData'.",
  ];
  assert.deepEqual(onlyInReact18(react18, react19), [react18[1]]);
});

test("treats declarations in workspace dependencies outside the package as upstream", () => {
  const { own, upstream } = splitDiagnostics(
    "../assistant-stream/dist/core/AssistantStream.d.ts(10,31): error TS2304: Cannot find name 'ReadableStream'.\n",
  );
  assert.equal(own.length, 0);
  assert.equal(upstream.length, 1);
});

test("decides whether a project reads dist from its resolved include and files", () => {
  const reads = (config, projectDir = "/pkg") =>
    readsDist(config, projectDir, "/pkg");
  assert.equal(reads({ include: ["dist"] }), true);
  assert.equal(reads({ include: ["./dist/**/*.d.ts"] }), true);
  assert.equal(reads({ include: ["src"], files: ["./dist/index.d.ts"] }), true);
  assert.equal(reads({ include: ["../../dist"] }, "/pkg/src/nested"), true);
  assert.equal(reads({ include: ["src", "distribution"] }), false);
  assert.equal(reads({ include: ["**/*.ts"] }), false);
});
