import { describe, expect, it, vi } from "vitest";
import { ToolCallReaderImpl } from "./ToolCallReader";

const parsePartialJsonObjectCalls = vi.hoisted(() => vi.fn());

vi.mock(
  "../../utils/json/parse-partial-json-object",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("../../utils/json/parse-partial-json-object")
      >();
    return {
      ...original,
      parsePartialJsonObject: (
        ...args: Parameters<typeof original.parsePartialJsonObject>
      ) => {
        parsePartialJsonObjectCalls(...args);
        return original.parsePartialJsonObject(...args);
      },
    };
  },
);

type Args = {
  required: string;
  optional?: string;
  items?: string[];
};

const createReader = () => new ToolCallReaderImpl<Args, string>();

describe("ToolCallArgsReader parsing", () => {
  it("does not parse streamed arguments without an active reader", async () => {
    parsePartialJsonObjectCalls.mockClear();
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"');
    await reader.appendArgsTextDelta("hello");
    await reader.appendArgsTextDelta('"}');
    await reader.finishArgsText();

    expect(parsePartialJsonObjectCalls).not.toHaveBeenCalled();
  });

  it("parses accumulated arguments when a reader starts", async () => {
    parsePartialJsonObjectCalls.mockClear();
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"hel');
    expect(parsePartialJsonObjectCalls).not.toHaveBeenCalled();

    const stream = reader.args.streamText("required");
    expect(parsePartialJsonObjectCalls).toHaveBeenCalledOnce();

    await reader.appendArgsTextDelta('lo"}');
    await reader.finishArgsText();

    let value = "";
    for await (const delta of stream) value += delta;
    expect(value).toBe("hello");
  });

  it("stops parsing after the last reader settles", async () => {
    parsePartialJsonObjectCalls.mockClear();
    const reader = createReader();
    const required = reader.args.get("required");

    await reader.appendArgsTextDelta('{"required":"hello",');
    expect(await required).toBe("hello");
    expect(parsePartialJsonObjectCalls).toHaveBeenCalledTimes(2);

    await reader.appendArgsTextDelta('"optional":"later"}');
    await reader.finishArgsText();
    expect(parsePartialJsonObjectCalls).toHaveBeenCalledTimes(2);
  });

  it("parses completed arguments for a late reader", async () => {
    parsePartialJsonObjectCalls.mockClear();
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"hello"}');
    await reader.finishArgsText();
    expect(parsePartialJsonObjectCalls).not.toHaveBeenCalled();

    await expect(reader.args.get("required")).resolves.toBe("hello");
    expect(parsePartialJsonObjectCalls).toHaveBeenCalledOnce();
  });

  it("stops parsing after a reader is cancelled", async () => {
    parsePartialJsonObjectCalls.mockClear();
    const reader = createReader();

    await reader.appendArgsTextDelta('{"required":"hel');
    const streamReader = reader.args.streamText("required").getReader();
    expect(parsePartialJsonObjectCalls).toHaveBeenCalledOnce();

    await streamReader.cancel();
    parsePartialJsonObjectCalls.mockClear();
    await reader.appendArgsTextDelta('lo"}');
    await reader.finishArgsText();
    expect(parsePartialJsonObjectCalls).not.toHaveBeenCalled();
  });

  it("does not emit stale values for an unparseable delta", async () => {
    const reader = createReader();
    const stream = reader.args.streamValues("required");

    await reader.appendArgsTextDelta('{"required":"hi');
    await reader.appendArgsTextDelta("\\uZZ");
    await reader.finishArgsText();

    const values: string[] = [];
    for await (const value of stream) values.push(value ?? "");
    expect(values).toEqual(["hi"]);
  });
});

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
