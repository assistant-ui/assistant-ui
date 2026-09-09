import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { collectTurboFilteredPackageNames } from "./lib/workspace.mjs";
import {
  collectDirectTypecheckPackageNames,
  dependencyBuildFilters,
} from "./test-types.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const collectBuildSelection = (packageNames) =>
  collectTurboFilteredPackageNames(
    repoRoot,
    dependencyBuildFilters(packageNames),
    { failureMessage: "Unable to resolve typecheck dependency build" },
  );

test("builds dependencies without building an example target", () => {
  const selected = collectDirectTypecheckPackageNames(repoRoot, "with-cloud");
  const buildSelection = collectBuildSelection(selected);

  assert.deepEqual([...selected], ["with-cloud"]);
  assert.equal(buildSelection.has("with-cloud"), false);
  assert.equal(buildSelection.has("@assistant-ui/react"), true);
});

test("keeps an app dependency while omitting the selected app", () => {
  const selected = collectDirectTypecheckPackageNames(
    repoRoot,
    "@assistant-ui/docs",
  );
  const buildSelection = collectBuildSelection(selected);

  assert.equal(buildSelection.has("@assistant-ui/docs"), false);
  assert.equal(buildSelection.has("@assistant-ui/shadcn-registry"), true);
});

test("builds a dependency that is also directly changed", () => {
  const buildSelection = collectBuildSelection([
    "@assistant-ui/store",
    "@assistant-ui/tap",
  ]);

  assert.equal(buildSelection.has("@assistant-ui/store"), false);
  assert.equal(buildSelection.has("@assistant-ui/tap"), true);
  assert.equal(buildSelection.has("@assistant-ui/x-buildutils"), true);
});

test("keeps the incremental gate on workspaces with a clean baseline", () => {
  const selected = collectDirectTypecheckPackageNames(
    repoRoot,
    "@assistant-ui/core",
  );

  assert.deepEqual([...selected], []);
});

test("allows a recursive filter to select no workspace", () => {
  const result = spawnSync(
    "pnpm",
    ["-r", "--filter=definitely-no-such-workspace", "exec", "true"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
});
