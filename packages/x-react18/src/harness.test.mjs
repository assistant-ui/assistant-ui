import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const bin = join(packageRoot, "bin/aui-react18-types.mjs");

// Fixtures live inside the package so they resolve its node_modules and the workspace's React 19 types.
function fixture(files) {
  const dir = mkdtempSync(join(packageRoot, ".fixture-"));
  for (const [path, content] of Object.entries({
    "package.json": JSON.stringify({ name: "fixture", private: true }),
    ...files,
  })) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

const typesFixture = (files) =>
  fixture({
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "esnext",
        moduleResolution: "bundler",
        skipLibCheck: true,
        types: [],
      },
    }),
    "tsconfig.peer-react18.json": JSON.stringify({
      extends: ["./tsconfig.json", "../tsconfig.react18.json"],
      include: ["dist/**/*.d.ts"],
    }),
    ...files,
  });

const check = (dir) =>
  spawnSync(process.execPath, [bin], { cwd: dir, encoding: "utf8" });

test("passes declarations that type-check against React 18", () => {
  const dir = typesFixture({
    "dist/index.d.ts":
      'import type { ReactNode } from "react";\nexport declare const node: ReactNode;\n',
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails on the package's own React 19-only declarations", () => {
  const dir = typesFixture({
    "dist/index.d.ts":
      'import { use } from "react";\nexport declare const read: typeof use;\n',
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no exported member 'use'/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails on an upstream error that only React 18's types introduce", () => {
  const dir = typesFixture({
    "node_modules/upstream/package.json": JSON.stringify({
      name: "upstream",
      types: "index.d.ts",
    }),
    "node_modules/upstream/index.d.ts":
      'import { use } from "react";\nexport declare const read: typeof use;\n',
    "dist/index.d.ts": 'export { read } from "upstream";\n',
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /introduce errors in upstream declarations/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("passes an upstream error that fails the same way against React 19", () => {
  const dir = typesFixture({
    "node_modules/upstream/package.json": JSON.stringify({
      name: "upstream",
      types: "index.d.ts",
    }),
    "node_modules/upstream/index.d.ts":
      "export declare const broken: MissingType;\n",
    "dist/index.d.ts": 'export { broken } from "upstream";\n',
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /fail the same way against React 19/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("react18() runs a vitest suite on React 18, including react-dom and require", () => {
  const dir = fixture({
    "vitest.config.mjs": `import { mergeConfig } from "vitest/config";\nimport { react18 } from "../src/vitest.mjs";\nexport default mergeConfig(react18({ root: import.meta.dirname }), { test: { include: ["*.test.mjs"] } });\n`,
    "render.test.mjs": `import { createRequire } from "node:module";
import { createElement, useState, version } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

test("renders on React 18", () => {
  const require = createRequire(import.meta.url);
  expect(version).toMatch(/^18\\./);
  expect(require("react").version).toMatch(/^18\\./);
  const App = () => createElement("b", null, useState(1)[0]);
  expect(renderToString(createElement(App))).toBe("<b>1</b>");
});
`,
  });
  try {
    const vitestPackage = createRequire(
      join(packageRoot, "package.json"),
    ).resolve("vitest/package.json");
    const vitest = join(
      dirname(vitestPackage),
      JSON.parse(readFileSync(vitestPackage, "utf8")).bin.vitest,
    );
    const result = spawnSync(process.execPath, [vitest, "run", "--root", dir], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /1 passed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails a project whose extends order restores React 19's types", () => {
  const dir = typesFixture({
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "esnext",
        moduleResolution: "bundler",
        skipLibCheck: true,
        types: [],
        paths: { "@/*": ["./src/*"] },
      },
    }),
    "tsconfig.peer-react18.json": JSON.stringify({
      extends: ["../tsconfig.react18.json", "./tsconfig.json"],
      include: ["dist/**/*.d.ts"],
    }),
    "dist/index.d.ts":
      'import { use } from "react";\nexport declare const read: typeof use;\n',
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /doesn't map `react`, `react\/\*`/);
    assert.match(result.stderr, /skipLibCheck on/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails a project that maps only some of react and react-dom to React 18", () => {
  const dir = typesFixture({
    "tsconfig.peer-react18.json": JSON.stringify({
      extends: ["./tsconfig.json", "../tsconfig.react18.json"],
      compilerOptions: {
        paths: { react: ["../node_modules/@types/react-v18"] },
      },
      include: ["dist/**/*.d.ts"],
    }),
    "dist/index.d.ts": "export declare const value: number;\n",
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /doesn't map `react\/\*`, `react-dom`, `react-dom\/\*`/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails a project that includes dist as a directory with skipLibCheck on", () => {
  const dir = typesFixture({
    "tsconfig.peer-react18.json": JSON.stringify({
      extends: ["./tsconfig.json", "../tsconfig.react18.json"],
      compilerOptions: { skipLibCheck: true },
      include: ["dist"],
    }),
    "dist/index.d.ts":
      'import { use } from "react";\nexport declare const read: typeof use;\n',
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /skipLibCheck on/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rebuilds a stale dist that the project includes as a directory", () => {
  const dir = typesFixture({
    "package.json": JSON.stringify({
      name: "fixture",
      private: true,
      scripts: { build: "node build.mjs" },
    }),
    "build.mjs":
      'import { writeFileSync } from "node:fs";\nwriteFileSync("dist/index.d.ts", "export declare const value: number;\\n");\n',
    "tsconfig.peer-react18.json": JSON.stringify({
      extends: ["./tsconfig.json", "../tsconfig.react18.json"],
      include: ["dist"],
    }),
    "dist/index.d.ts":
      'import { use } from "react";\nexport declare const read: typeof use;\n',
    "src/index.ts": "export const value = 1;\n",
  });
  try {
    utimesSync(join(dir, "dist/index.d.ts"), new Date(0), new Date(0));
    const result = check(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /older than src, so building first/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("builds a missing dist before resolving the project that includes it", () => {
  const dir = typesFixture({
    "package.json": JSON.stringify({
      name: "fixture",
      private: true,
      scripts: { build: "node build.mjs" },
    }),
    "build.mjs":
      'import { mkdirSync, writeFileSync } from "node:fs";\nmkdirSync("dist", { recursive: true });\nwriteFileSync("dist/index.d.ts", "export declare const value: number;\\n");\n',
    "src/index.ts": "export const value = 1;\n",
  });
  try {
    const result = check(dir);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /building first/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
