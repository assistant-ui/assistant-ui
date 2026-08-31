import * as path from "node:path";
import { ts } from "ts-morph";
import { DOCS_ROOT, REPO_ROOT } from "./paths.mts";

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
  it.each([
    ["assistant-stream", "packages/assistant-stream/src/index.ts"],
    ["assistant-cloud", "packages/cloud/src/index.ts"],
    ["safe-content-frame", "packages/safe-content-frame/src/index.ts"],
    [
      "safe-content-frame/shadow_dom",
      "packages/safe-content-frame/src/shadow_dom.ts",
    ],
  ])("resolves %s from source", (specifier, sourceFile) => {
    expect(resolveWorkspaceModule(specifier)).toBe(
      path.join(REPO_ROOT, sourceFile),
    );
  });
});
