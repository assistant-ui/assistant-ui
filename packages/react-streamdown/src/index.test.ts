import { describe, it, expect } from "vitest";
import * as exports from "./index";

describe("package exports", () => {
  it("exports StreamdownTextPrimitive", () => {
    expect(exports.StreamdownTextPrimitive).toBeDefined();
  });

  it("exports all expected types", () => {
    // Type-only exports can't be tested at runtime,
    // but we can verify the module shape
    const exportKeys = Object.keys(exports);
    expect(exportKeys).toContain("StreamdownTextPrimitive");
  });
});
