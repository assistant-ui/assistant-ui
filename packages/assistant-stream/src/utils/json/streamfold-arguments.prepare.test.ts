import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StructuredStreamPool } from "streamfold";
import type { ToolCallPart } from "../../core/utils/types";

const prepare = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("streamfold", async (importOriginal) => ({
  ...(await importOriginal<typeof import("streamfold")>()),
  prepareStreamfold: prepare,
}));

const part = (argsText = ""): ToolCallPart => ({
  type: "tool-call",
  toolCallId: "call",
  toolName: "example",
  argsText,
  args: {},
  state: "partial-call",
  status: { type: "running", isArgsComplete: false },
});
beforeEach(() => {
  vi.resetModules();
  prepare.mockReset();
});
afterEach(() => vi.restoreAllMocks());

it("keeps legacy parsing until background compilation completes and shares preparation", async () => {
  let finish!: () => void;
  prepare.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  const { prepareStreamfold, StreamfoldArguments } =
    await import("./streamfold-arguments");
  const ready = prepareStreamfold();
  expect(prepareStreamfold()).toBe(ready);
  await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());
  const start = vi.spyOn(StructuredStreamPool.prototype, "start");
  const parser = new StreamfoldArguments();
  const prefix = '{"value":"' + "x".repeat(4096);
  try {
    expect(parser.read(0, part(), prefix)).toMatchObject({
      value: "x".repeat(4096),
    });
    expect(start).not.toHaveBeenCalled();
    finish();
    await ready;
    expect(parser.read(0, part(prefix), "y")).toMatchObject({
      value: "x".repeat(4096) + "y",
    });
    expect(start).toHaveBeenCalledOnce();
  } finally {
    finish();
    parser.dispose();
  }
});

it("uses the legacy parser when background compilation rejects", async () => {
  prepare.mockRejectedValue(new Error("WASM compilation blocked"));
  const { prepareStreamfold, StreamfoldArguments } =
    await import("./streamfold-arguments");
  await expect(prepareStreamfold()).resolves.toBeUndefined();
  const start = vi.spyOn(StructuredStreamPool.prototype, "start");
  const parser = new StreamfoldArguments();
  try {
    expect(
      parser.read(0, part(), '{"value":"' + "x".repeat(4096)),
    ).toMatchObject({ value: "x".repeat(4096) });
    expect(start).not.toHaveBeenCalled();
    await prepareStreamfold();
    expect(prepare).toHaveBeenCalledOnce();
  } finally {
    parser.dispose();
  }
});
