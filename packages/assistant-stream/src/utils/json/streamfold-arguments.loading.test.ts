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
      const prefix = '{"city":"' + "S".repeat(4096);
      expect(parser.read(0, part(), prefix)).toMatchObject({
        city: "S".repeat(4096),
      });
      expect(parser.read(0, part(prefix), ' Francisco"}')).toMatchObject({
        city: "S".repeat(4096) + " Francisco",
      });
      parser.dispose();
    },
  );

  it("preserves arguments while loading and catches up when the engine is ready", async () => {
    vi.resetModules();
    const { prepareStreamfold, StreamfoldArguments } =
      await import("./streamfold-arguments");
    const parser = new StreamfoldArguments();
    const prefix = '{"city":"' + "S".repeat(4095);
    const first = parser.read(0, part(), prefix);
    expect(first).toMatchObject({ city: "S".repeat(4095) });
    await prepareStreamfold();
    const { StructuredStreamPool } = await import("streamfold");
    const push = vi.spyOn(StructuredStreamPool.prototype, "push");
    expect(parser.read(0, part(prefix), "F")).toMatchObject({
      city: "S".repeat(4095) + "F",
    });
    expect(push.mock.calls[0]?.[1]).toBe(prefix + "F");
    expect(first).toMatchObject({ city: "S".repeat(4095) });
    parser.dispose();
  });
});
