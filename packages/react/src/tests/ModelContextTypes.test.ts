import { describe, it, expect } from "vitest";
import { mergeModelContexts, ModelContext, ModelContextProvider } from "../model-context/ModelContextTypes";

const createProvider = (context: ModelContext): ModelContextProvider => ({
  getModelContext: () => context,
});

// Simple tool placeholders
const toolA = {} as any;
const toolB = {} as any;

describe("mergeModelContexts", () => {
  it("merges system strings based on priority", () => {
    const high = createProvider({ priority: 2, system: "high" });
    const low = createProvider({ priority: 1, system: "low" });
    const result = mergeModelContexts(new Set([low, high]));
    expect(result.system).toBe("high\n\nlow");
  });

  it("overrides config and callSettings from lower priority", () => {
    const high = createProvider({
      priority: 5,
      config: { modelName: "gpt4" },
      callSettings: { temperature: 0.3 },
    });
    const low = createProvider({
      priority: 1,
      config: { modelName: "gpt3", baseUrl: "http://foo" },
      callSettings: { temperature: 0.9 },
    });
    const result = mergeModelContexts(new Set([high, low]));
    expect(result.config).toEqual({ modelName: "gpt3", baseUrl: "http://foo" });
    expect(result.callSettings).toEqual({ temperature: 0.9 });
  });

  it("throws when tool names collide with different instances", () => {
    const high = createProvider({ priority: 1, tools: { a: toolA } });
    const low = createProvider({ priority: 0, tools: { a: toolB } });
    expect(() => mergeModelContexts(new Set([high, low]))).toThrow(
      /already exists/
    );
  });
});
