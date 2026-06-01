import { describe, it, expect } from "vitest";
import { defineToolkit } from "./define-toolkit";
import { hitl } from "./hitl";

describe("use-generative markers", () => {
  it("defineToolkit throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => defineToolkit({})).toThrow(/no runtime implementation/);
  });

  it("hitl throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => hitl()).toThrow(/no runtime implementation/);
  });
});
