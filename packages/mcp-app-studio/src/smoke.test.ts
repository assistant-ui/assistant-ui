import { describe, expect, it } from "vitest";
import {
  disableDebugMode,
  enableDebugMode,
  hasChatGPTExtensions,
  isMCP,
} from "./sdk";

describe("smoke", () => {
  it("exports core runtime helpers", () => {
    expect(typeof isMCP).toBe("function");
    expect(typeof hasChatGPTExtensions).toBe("function");
    expect(typeof enableDebugMode).toBe("function");
    expect(typeof disableDebugMode).toBe("function");
  });
});
