import * as path from "node:path";
import { ts } from "ts-morph";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");
const DOCS_ROOT = path.join(REPO_ROOT, "apps/docs");
const DOCS_TSCONFIG = path.join(DOCS_ROOT, "tsconfig.json");
const PROBE_FILE = path.join(
  DOCS_ROOT,
  "scripts/generated-docs/workspace-resolution.test.ts",
);

function resolveWorkspaceModule(specifier: string): string | undefined {
  const config = ts.readConfigFile(DOCS_TSCONFIG, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    DOCS_ROOT,
  );
  return ts.resolveModuleName(specifier, PROBE_FILE, parsed.options, ts.sys)
    .resolvedModule?.resolvedFileName;
}

describe("workspace package resolution", () => {
  it("resolves safe-content-frame exports from source", () => {
    expect(resolveWorkspaceModule("safe-content-frame")).toBe(
      path.join(REPO_ROOT, "packages/safe-content-frame/src/index.ts"),
    );
    expect(resolveWorkspaceModule("safe-content-frame/shadow_dom")).toBe(
      path.join(REPO_ROOT, "packages/safe-content-frame/src/shadow_dom.ts"),
    );
  });
});
