import { describe, expect, it } from "vitest";
import { toSandboxName } from "./blaxel-sandbox";

describe("toSandboxName", () => {
  it("uses the complete session ID when deriving the resource name", () => {
    const sharedPrefix = "a".repeat(32);

    expect(toSandboxName(`${sharedPrefix}.user-one`)).not.toBe(
      toSandboxName(`${sharedPrefix}.user-two`),
    );
  });
});
