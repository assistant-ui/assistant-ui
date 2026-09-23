import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("package metadata", () => {
  it("uses the host application's ai instance", () => {
    expect(packageJson.peerDependencies.ai).toBe("^7.0.101");
    expect(packageJson.devDependencies.ai).toBe("^7.0.101");
    expect(packageJson.dependencies.ai).toBeUndefined();
  });
});
