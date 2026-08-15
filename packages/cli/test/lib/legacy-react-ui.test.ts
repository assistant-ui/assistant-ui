import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as nodePath from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertNoLegacyReactUIImports,
  hasLegacyReactUIImports,
} from "../../src/lib/legacy-react-ui";

describe("hasLegacyReactUIImports", () => {
  it("detects components that the legacy package split would move", () => {
    expect(
      hasLegacyReactUIImports(`
        import { Thread, useLocalRuntime } from "@assistant-ui/react";
      `),
    ).toBe(true);
  });

  it("detects existing legacy package and style imports", () => {
    expect(
      hasLegacyReactUIImports(
        `import { Thread } from "@assistant-ui/react-ui";`,
      ),
    ).toBe(true);
    expect(
      hasLegacyReactUIImports(`import "@assistant-ui/react/styles/index.css";`),
    ).toBe(true);
  });

  it("allows current primitives and registry components", () => {
    expect(
      hasLegacyReactUIImports(`
        import { ThreadPrimitive, useLocalRuntime } from "@assistant-ui/react";
        import { Thread } from "@/components/assistant-ui/thread";
      `),
    ).toBe(false);
  });

  it("reports an actionable migration error before upgrading", () => {
    const cwd = mkdtempSync(nodePath.join(tmpdir(), "aui-legacy-upgrade-"));
    const filename = nodePath.join(cwd, "thread.tsx");
    writeFileSync(filename, `import { Thread } from "@assistant-ui/react";`);

    try {
      expect(() => assertNoLegacyReactUIImports([filename], cwd)).toThrow(
        /docs\/migrations\/v0-15/,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
