import { describe, it, expect } from "vitest";
import { claudeParityImportMap } from "./defaultImportMap";

describe("claudeParityImportMap", () => {
  it("loads react-router-dom with shared React externals", () => {
    expect(claudeParityImportMap["react-router-dom"]).toContain(
      "?external=react,react-dom",
    );
  });
});
