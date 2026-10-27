import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

describe("Eve peer compatibility", () => {
  it("excludes Eve 0.84 from the published peer range", () => {
    expect(packageJson.peerDependencies.eve).toBe(">=0.32.0 <0.84.0");
  });
});
