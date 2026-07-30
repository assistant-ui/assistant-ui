import { describe, expect, it } from "vitest";
import { LEARN_SPOTLIGHT_HREF, parseLearnAutoStartSource } from "./entry";

describe("Learn entry", () => {
  it("uses one explicit Playground spotlight destination", () => {
    expect(LEARN_SPOTLIGHT_HREF).toBe("/learn?start=1&source=spotlight");
  });

  it("allows spotlight attribution and defaults every other value safely", () => {
    expect(parseLearnAutoStartSource("spotlight")).toBe("spotlight");
    expect(parseLearnAutoStartSource("suggestion")).toBe("suggestion");
    expect(parseLearnAutoStartSource("footer")).toBe("suggestion");
    expect(parseLearnAutoStartSource(undefined)).toBe("suggestion");
  });
});
