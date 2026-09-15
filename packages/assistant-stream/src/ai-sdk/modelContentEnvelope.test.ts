import { describe, expect, it } from "vitest";
import {
  unwrapModelContentEnvelope,
  wrapModelContentEnvelope,
} from "./modelContentEnvelope";

describe("modelContentEnvelope", () => {
  const modelContent = [{ type: "text" as const, text: "summary" }];

  it("round-trips a result with its model content", () => {
    const envelope = wrapModelContentEnvelope({ ok: true }, modelContent);

    expect(unwrapModelContentEnvelope(envelope)).toEqual({
      result: { ok: true },
      modelContent,
    });
  });

  it("passes plain outputs through without model content", () => {
    expect(unwrapModelContentEnvelope("done")).toEqual({ result: "done" });
    expect(unwrapModelContentEnvelope<unknown>(null)).toEqual({ result: null });
  });

  it("passes through an envelope key that does not hold an array", () => {
    const value: unknown = { __aui_modelContent: "nope", value: 1 };

    expect(unwrapModelContentEnvelope(value)).toEqual({ result: value });
  });
});
