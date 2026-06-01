import { describe, expect, it } from "vitest";
import { ToolCallReaderImpl } from "./ToolCallReader";

type Args = {
  required: string;
  optional?: string;
  items?: string[];
};

const createReader = () => new ToolCallReaderImpl<Args, string>();

describe("ToolCallArgsReader.get", () => {
  it("resolves with the value once the field is complete", async () => {
    const reader = createReader();
    const promise = reader.args.get("required");

    await reader.appendArgsTextDelta('{"required":"hello"}');

    expect(await promise).toBe("hello");
  });

  it("resolves to undefined for an absent field once args close", async () => {
    const reader = createReader();
    const promise = reader.args.get("optional");

    await reader.appendArgsTextDelta('{"required":"hello"}');
    await reader.finishArgsText();

    // Previously this never resolved and deadlocked the tool.
    expect(await promise).toBeUndefined();
  });

  it("resolves to undefined for a field requested after args close", async () => {
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"hello"}');
    await reader.finishArgsText();

    expect(await reader.args.get("optional")).toBeUndefined();
    expect(await reader.args.get("required")).toBe("hello");
  });

  it("does not deadlock awaiting an optional arg inside a side effect", async () => {
    const reader = createReader();

    const sideEffect = (async () => {
      const optional = await reader.args.get("optional");
      return optional ?? "fallback";
    })();

    await reader.appendArgsTextDelta('{"required":"hello"}');
    await reader.finishArgsText();

    expect(await sideEffect).toBe("fallback");
  });
});

describe("ToolCallArgsReader streams", () => {
  it("closes streamValues when args close without the field", async () => {
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"hello"}');
    await reader.finishArgsText();

    const seen: unknown[] = [];
    for await (const value of reader.args.streamValues("items")) {
      seen.push(value);
    }

    expect(seen).toEqual([]);
  });

  it("emits completed array items and closes via forEach", async () => {
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"hi","items":["a","b"]}');
    await reader.finishArgsText();

    const seen: string[] = [];
    for await (const item of reader.args.forEach("items")) {
      seen.push(item);
    }

    expect(seen).toEqual(["a", "b"]);
  });
});
