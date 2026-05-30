import { describe, it, expect } from "vitest";
import { defineToolkit } from "./define-toolkit";

describe("defineToolkit", () => {
  it("throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => defineToolkit({})).toThrow(/no runtime implementation/);
  });
});
