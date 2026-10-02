import assert from "node:assert/strict";
import { test } from "node:test";
import { autofixInstallArgs } from "./autofix-install.mjs";

const installArgs = ["install", "--frozen-lockfile", "--ignore-scripts"];

test("shared API surface inputs keep the full install fallback", () => {
  assert.deepEqual(
    autofixInstallArgs(["pnpm-lock.yaml"], "origin/main"),
    installArgs,
  );
});

test("package changes install only the dependencies autofix executes", () => {
  assert.deepEqual(
    autofixInstallArgs(["packages/react/src/index.ts"], "origin/main"),
    [
      ...installArgs,
      "--filter=.",
      "--filter=@assistant-ui/x-buildutils...",
      "--filter=...[origin/main]...",
      "--filter=!./apps/*",
      "--filter=!./examples/*",
      "--filter=!./templates/*",
    ],
  );
});

test("unrelated changes still install the root autofix tools", () => {
  assert.deepEqual(autofixInstallArgs(["README.md"], "origin/main"), [
    ...installArgs,
    "--filter=.",
    "--filter=@assistant-ui/x-buildutils...",
    "--filter=...[origin/main]...",
    "--filter=!./apps/*",
    "--filter=!./examples/*",
    "--filter=!./templates/*",
  ]);
});
