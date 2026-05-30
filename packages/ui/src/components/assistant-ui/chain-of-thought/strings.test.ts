import { describe, expect, it } from "vitest";
import {
  defaultChainOfThoughtStrings,
  mergeChainOfThoughtStrings,
} from "./strings";

describe("ChainOfThought strings seam", () => {
  it("builds the default English trace summary with Intl.PluralRules counts", () => {
    const { traceSummary } = defaultChainOfThoughtStrings;
    expect(
      traceSummary({
        totalSteps: 1,
        searchSteps: 1,
        toolSteps: 0,
        incomplete: false,
      }),
    ).toBe("Researched 1 source");
    expect(
      traceSummary({
        totalSteps: 3,
        searchSteps: 0,
        toolSteps: 2,
        incomplete: false,
        durationSec: 4,
      }),
    ).toBe("Ran 2 tools (4s)");
    expect(
      traceSummary({
        totalSteps: 2,
        searchSteps: 0,
        toolSteps: 0,
        incomplete: true,
      }),
    ).toBe("Stopped after 2 steps");
  });

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

  it("lets a locale override the trace summary grammar through the seam", () => {
    // A localizer routes counts through their own Intl.PluralRules.
    const fr = new Intl.PluralRules("fr-FR");
    const strings = mergeChainOfThoughtStrings({
      traceSummary: ({ searchSteps }) =>
        // French: 0 and 1 are "one", so "source" stays singular for 0 and 1.
        `Consulté ${searchSteps} ${fr.select(searchSteps) === "one" ? "source" : "sources"}`,
    });
    expect(
      strings.traceSummary({
        totalSteps: 1,
        searchSteps: 1,
        toolSteps: 0,
        incomplete: false,
      }),
    ).toBe("Consulté 1 source");
    expect(
      strings.traceSummary({
        totalSteps: 2,
        searchSteps: 2,
        toolSteps: 0,
        incomplete: false,
      }),
    ).toBe("Consulté 2 sources");
    // Unspecified strings still fall back to the English defaults.
    expect(strings.reasoning).toBe("Reasoning");
    expect(strings.thinking).toBe("Thinking...");
  });
});
