import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTarExcludeArgs,
  safeExportFilename,
  shouldExcludeRelativePath,
} from "../workspace-export/policy.js";

describe("workspace export policy", () => {
  it("excludes dependency, build, git, and env paths", () => {
    assert.equal(
      shouldExcludeRelativePath("node_modules/react/index.js"),
      true,
    );
    assert.equal(shouldExcludeRelativePath(".next/server/app.js"), true);
    assert.equal(shouldExcludeRelativePath(".git/config"), true);
    assert.equal(shouldExcludeRelativePath(".env"), true);
    assert.equal(
      shouldExcludeRelativePath("apps/web/.env.production.local"),
      true,
    );
    assert.equal(shouldExcludeRelativePath("src/app/page.tsx"), false);
  });

  it("builds tar excludes and safe filenames deterministically", () => {
    const args = buildTarExcludeArgs();
    assert.match(args, /--exclude='\.\/node_modules'/);
    assert.match(args, /--exclude='\.\/\.env\.local'/);
    assert.equal(
      safeExportFilename({
        productId: "Assistant UI!",
        sessionId: "ABCDEF1234567890",
      }),
      "assistant-ui-workspace-abcdef123456.tar.gz",
    );
  });
});
