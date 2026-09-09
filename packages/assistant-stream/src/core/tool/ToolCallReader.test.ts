import { describe, expect, it } from "vitest";
import { ToolCallReaderImpl } from "./ToolCallReader";

type Args = {
  required: string;
  optional?: string;
  items?: string[];
};

const createReader = () => new ToolCallReaderImpl<Args, string>();

describe("ToolCallArgsReader.get", () => {
  it("waits for all digits of a positive exponent", async () => {
    const reader = new ToolCallReaderImpl<{ amount: number }, string>();
    const amount = reader.args.get("amount");

    await reader.appendArgsTextDelta('{"amount":1e+2');
    await reader.appendArgsTextDelta("3}");
    await reader.finishArgsText();

    expect(await amount).toBe(1e23);
  });

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

  it("registers a reader after earlier deltas", async () => {
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"hel');
    const required = reader.args.get("required");
    await reader.appendArgsTextDelta('lo"}');

    expect(await required).toBe("hello");
  });

  it("removes a get reader after it settles", async () => {
    const reader = createReader();
    const handles = (reader.args as unknown as { handles: Set<unknown> })
      .handles;
    const required = reader.args.get("required");

    expect(handles.size).toBe(1);
    await reader.appendArgsTextDelta('{"required":"hello"}');
    await required;

    expect(handles.size).toBe(0);
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

  it("removes a stream reader when it is cancelled", async () => {
    const reader = createReader();
    const handles = (reader.args as unknown as { handles: Set<unknown> })
      .handles;
    const streamReader = reader.args.streamText("required").getReader();

    expect(handles.size).toBe(1);
    await streamReader.cancel();

    expect(handles.size).toBe(0);
  });
});
