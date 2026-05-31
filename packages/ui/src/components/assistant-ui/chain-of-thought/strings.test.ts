import { describe, expect, it } from "vitest";
import {
  defaultChainOfThoughtStrings,
  mergeChainOfThoughtStrings,
} from "./strings";

describe("ChainOfThought strings seam", () => {
  it("formats the streaming reasoning prefix and allows overriding it", () => {
    expect(defaultChainOfThoughtStrings.reasoningActivity("weighing X")).toBe(
      "Thinking: weighing X",
    );
    const strings = mergeChainOfThoughtStrings({
      reasoningActivity: (snippet) => `Razonando: ${snippet}`,
    });
    expect(strings.reasoningActivity("sopesando X")).toBe(
      "Razonando: sopesando X",
    );
  });

  it("falls back to defaults for unspecified localized strings", () => {
    const strings = mergeChainOfThoughtStrings({
      reasoning: "Razonamiento",
    });

    expect(strings.reasoning).toBe("Razonamiento");
    expect(strings.thinking).toBe("Thinking...");
  });
});
