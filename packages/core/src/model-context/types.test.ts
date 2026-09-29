import { describe, expect, it } from "vitest";
import { mergeModelContexts } from "./types";

const provider = (tools: Record<string, any>, priority?: number) =>
  ({ getModelContext: () => ({ tools, priority }) }) as any;

const contextProvider = (context: Record<string, unknown>) =>
  ({ getModelContext: () => context }) as any;

describe("mergeModelContexts", () => {
  it("keeps higher-priority model settings when providers overlap", () => {
    const result = mergeModelContexts(
      new Set([
        contextProvider({
          priority: 0,
          config: { modelName: "low-priority", baseUrl: "https://low.test" },
          callSettings: { temperature: 0.9, topP: 0.8 },
          unstable_composerMetadata: {
            source: "low-priority",
            inherited: true,
          },
        }),
        contextProvider({
          priority: 1000,
          config: { modelName: "high-priority" },
          callSettings: { temperature: 0.1 },
          unstable_composerMetadata: { source: "high-priority" },
        }),
      ]),
    );

    expect(result.config).toEqual({
      modelName: "high-priority",
      baseUrl: "https://low.test",
    });
    expect(result.callSettings).toEqual({ temperature: 0.1, topP: 0.8 });
    expect(result.unstable_composerMetadata).toEqual({
      source: "high-priority",
      inherited: true,
    });
  });

  it.each(["__proto__", "constructor", "toString"])(
    "retains and prioritizes a tool named %s",
    (name) => {
      const highPriorityTool = { description: "high", parameters: {} };
      const lowPriorityTool = { description: "low", parameters: {} };
      const otherTool = { description: "other", parameters: {} };
      const result = mergeModelContexts(
        new Set([
          provider({ [name]: highPriorityTool, ok: otherTool }, 1),
          provider({ [name]: lowPriorityTool }, 0),
        ]),
      );

      expect(Object.keys(result.tools ?? {})).toEqual([name, "ok"]);
      expect(result.tools?.[name]?.description).toBe("high");
    },
  );
});
