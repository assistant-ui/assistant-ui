import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolCallPart } from "../../core/utils/types";

const part = (argsText = ""): ToolCallPart => ({
  type: "tool-call",
  toolCallId: "call",
  toolName: "weather",
  argsText,
  args: {},
  state: "partial-call",
  status: { type: "running", isArgsComplete: false },
});

describe("Streamfold initialization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it.each(["WebAssembly", "TextEncoder", "atob"])(
    "preserves parsing without %s",
    async (name) => {
      vi.resetModules();
      vi.stubGlobal(name, undefined);
      const { prepareStreamfold, StreamfoldArguments } =
        await import("./streamfold-arguments");
      await prepareStreamfold();
      const parser = new StreamfoldArguments();
      expect(parser.read(0, part(), '{"city":"San')).toMatchObject({
        city: "San",
      });
      expect(
        parser.read(0, part('{"city":"San'), ' Francisco"}'),
      ).toMatchObject({ city: "San Francisco" });
      parser.dispose();
    },
  );

  it("preserves arguments while loading and catches up when the engine is ready", async () => {
    vi.resetModules();
    const { prepareStreamfold, StreamfoldArguments } =
      await import("./streamfold-arguments");
    const parser = new StreamfoldArguments();
    const first = parser.read(0, part(), '{"city":"San');
    expect(first).toMatchObject({ city: "San" });
    await prepareStreamfold();
    const { StructuredStreamPool } = await import("streamfold");
    const push = vi.spyOn(StructuredStreamPool.prototype, "push");
    expect(parser.read(0, part('{"city":"San'), " Francisco")).toMatchObject({
      city: "San Francisco",
    });
    expect(push.mock.calls[0]?.[1]).toBe('{"city":"San Francisco');
    expect(first).toMatchObject({ city: "San" });
    parser.dispose();
  });
});
