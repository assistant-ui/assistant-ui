import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { REPO_ROOT } from "./paths.mts";
import type { WorkspaceResolutionReport } from "./workspace-resolution-report.mts";

const PACKAGES_DIR = path.join(REPO_ROOT, "packages");

// A child process keeps the TypeScript compiler out of V8 coverage, which slows it and measures nothing here because the generator is outside the coverage include list.
const report = JSON.parse(
  execFileSync(
    process.execPath,
    [path.join(import.meta.dirname, "workspace-resolution-report.mts")],
    { encoding: "utf8" },
  ),
) as WorkspaceResolutionReport;

describe("workspace package resolution", () => {
  it("maps safe-content-frame to its source entry points", () => {
    expect(report.safeContentFrame).toEqual({
      root: path.join(PACKAGES_DIR, "safe-content-frame/src/index.ts"),
      shadowDom: path.join(
        PACKAGES_DIR,
        "safe-content-frame/src/shadow_dom.ts",
      ),
    });
  });

  it("resolves every workspace import the generator reads to source", () => {
    expect(report.offenders).toEqual([]);
  });

  it("reads the public transport defaults without test augmentations", () => {
    expect(report.transport).toEqual({
      commandTypes: ["add-message", "add-tool-result"],
      stateIndexIsUnknown: true,
    });
  });
});
