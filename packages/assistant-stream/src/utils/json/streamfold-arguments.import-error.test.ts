import { expect, it, vi } from "vitest";
import type { ToolCallPart } from "../../core/utils/types";
import { parsePartialJsonObject } from "./parse-partial-json-object";
import { prepareStreamfold, StreamfoldArguments } from "./streamfold-arguments";

const rejectImport = vi.hoisted(() =>
  vi.fn<() => Record<string, never>>(() => {
    throw new Error("Failed to fetch dynamically imported module");
  }),
);
vi.mock("streamfold", async (importOriginal) => ({
  ...(await importOriginal<typeof import("streamfold")>()),
  ...rejectImport(),
}));

it("keeps parsing after a rejected dynamic import without retrying each delta", async () => {
  const parser = new StreamfoldArguments();
  const part: ToolCallPart = {
    type: "tool-call",
    toolCallId: "call",
    toolName: "example",
    argsText: "",
    args: {},
    state: "partial-call",
    status: { type: "running", isArgsComplete: false },
  };
  try {
    for (const delta of ['{"value":"' + "x".repeat(4096), "more", '"}']) {
      expect(parser.read(0, part, delta)).toEqual(
        parsePartialJsonObject(part.argsText + delta),
      );
      part.argsText += delta;
      await expect(prepareStreamfold()).resolves.toBeUndefined();
    }
    expect(rejectImport).toHaveBeenCalledOnce();
  } finally {
    parser.dispose();
  }
});
