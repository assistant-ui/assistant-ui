import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { updateWorkbenchIndex } from "./workbench-index";

describe("updateWorkbenchIndex", () => {
  it("is a no-op when lib/workbench/index.ts is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-workbench-"));
    fs.mkdirSync(path.join(root, "lib", "workbench"), { recursive: true });

    expect(() => updateWorkbenchIndex(root, ["welcome"])).not.toThrow();
  });

  it("updates wrapper exports when index.ts exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-workbench-"));
    const indexPath = path.join(root, "lib", "workbench", "index.ts");
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(
      indexPath,
      'export { WelcomeCardSDK } from "./wrappers";\n',
    );

    updateWorkbenchIndex(root, ["poi-map"]);

    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toContain('export { POIMapSDK } from "./wrappers";');
  });
});
