import { describe, expect, it } from "vitest";
import { mergeModelContexts } from "./types";

const provider = (tools: Record<string, any>, priority?: number) =>
  ({ getModelContext: () => ({ tools, priority }) }) as any;

describe("mergeModelContexts", () => {
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
