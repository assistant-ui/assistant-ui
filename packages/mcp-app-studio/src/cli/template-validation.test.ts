import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTemplateDir } from "./template-validation";

function createTemplateLayout(root: string): void {
  const files = [
    "package.json",
    "scripts/dev.ts",
    "scripts/export.ts",
    "lib/workbench/component-registry.tsx",
    "lib/workbench/wrappers/index.ts",
    "components/examples/index.ts",
    "lib/workbench/store.ts",
  ] as const;

  for (const file of files) {
    const filePath = path.join(root, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "// test fixture\n");
  }
}

describe("validateTemplateDir", () => {
  it("accepts template layouts that do not include lib/workbench/index.ts", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-template-"));
    createTemplateLayout(root);

    expect(() => validateTemplateDir(root)).not.toThrow();
  });
});
