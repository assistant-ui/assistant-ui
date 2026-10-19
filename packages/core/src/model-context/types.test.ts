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

describe("mergeModelContexts system", () => {
  const systems = () =>
    new Set([
      contextProvider({ system: "low", priority: -1 }),
      contextProvider({ system: "high", priority: 10 }),
      contextProvider({ system: "default" }),
      contextProvider({ priority: 5 }),
    ]);

  it("joins every system in priority order without options", () => {
    expect(mergeModelContexts(systems()).system).toBe("high\n\ndefault\n\nlow");
  });

  it("omits system when no provider sets one", () => {
    const result = mergeModelContexts(new Set([contextProvider({})]));
    expect(Object.hasOwn(result, "system")).toBe(false);
  });

  it("keeps higher-priority parts whole and cuts the first part that does not fit", () => {
    const result = mergeModelContexts(systems(), { maxSystemLength: 16 });
    expect(result.system).toBe("high\n\ndefault\n\nl");
  });

  it("counts separators toward the cap and drops parts with no room left", () => {
    expect(mergeModelContexts(systems(), { maxSystemLength: 6 }).system).toBe(
      "high",
    );
    expect(mergeModelContexts(systems(), { maxSystemLength: 7 }).system).toBe(
      "high\n\nd",
    );
    expect(mergeModelContexts(systems(), { maxSystemLength: 2 }).system).toBe(
      "hi",
    );
  });

  it("does not split a surrogate pair at the cut", () => {
    const result = mergeModelContexts(
      new Set([contextProvider({ system: "ab\u{1F600}cd" })]),
      { maxSystemLength: 3 },
    );
    expect(result.system).toBe("ab");
  });

  it("leaves the system unchanged when it fits the cap", () => {
    expect(mergeModelContexts(systems(), { maxSystemLength: 100 }).system).toBe(
      "high\n\ndefault\n\nlow",
    );
  });

  it("passes parts to mergeSystem in priority order", () => {
    const result = mergeModelContexts(systems(), {
      mergeSystem: (parts) => {
        expect(parts).toEqual([
          { system: "high", priority: 10 },
          { system: "default", priority: 0 },
          { system: "low", priority: -1 },
        ]);
        return parts.map((part) => part.system).join(" | ");
      },
    });
    expect(result.system).toBe("high | default | low");
  });

  it("throws when both maxSystemLength and mergeSystem are passed", () => {
    expect(() =>
      mergeModelContexts(systems(), {
        maxSystemLength: 10,
        mergeSystem: () => "",
      }),
    ).toThrow(/either maxSystemLength or mergeSystem/);
  });
});
