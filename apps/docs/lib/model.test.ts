import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL_ID,
  isAvailableModelId,
  isModelAllowed,
  resolveModelId,
} from "./model";

describe("model access", () => {
  it.each(["gpt-6-luna", "anthropic/claude-haiku-5-5"])(
    "requires sign-in for %s",
    (id) => {
      expect(isAvailableModelId(id)).toBe(true);
      expect(isModelAllowed(id, false)).toBe(false);
      expect(resolveModelId(id, false)).toBe(DEFAULT_MODEL_ID);
      expect(isModelAllowed(id, true)).toBe(true);
      expect(resolveModelId(id, true)).toBe(id);
    },
  );

  it("allows an ungated model for both visitors", () => {
    for (const signedIn of [false, true]) {
      expect(isModelAllowed("zai/glm-5.3-flash", signedIn)).toBe(true);
      expect(resolveModelId("zai/glm-5.3-flash", signedIn)).toBe(
        "zai/glm-5.3-flash",
      );
    }
  });

  it("falls back for an unknown model", () => {
    for (const signedIn of [false, true]) {
      expect(isModelAllowed("unknown", signedIn)).toBe(false);
      expect(resolveModelId("unknown", signedIn)).toBe(DEFAULT_MODEL_ID);
    }
  });
});
