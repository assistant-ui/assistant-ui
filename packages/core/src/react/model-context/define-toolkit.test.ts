import { describe, it, expect } from "vitest";
import { defineToolkit } from "./define-toolkit";
import { hitl, hitlTool } from "./hitl";
import { providerTool } from "./provider-tool";

describe("use-generative markers", () => {
  it("defineToolkit throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => defineToolkit({})).toThrow(/no runtime implementation/);
  });

  it("hitlTool throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => hitlTool()).toThrow(/no runtime implementation/);
  });

  it("hitl remains a compatibility alias", () => {
    expect(hitl).toBe(hitlTool);
  });

  it("providerTool throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() =>
      providerTool({
        providerId: "openai.web_search_preview",
        args: {},
      }),
    ).toThrow(/no runtime implementation/);
  });
});
