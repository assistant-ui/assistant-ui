import { describe, expect, it, vi } from "vitest";
import { ToolCallArgsReaderImpl, ToolCallReaderImpl } from "./ToolCallReader";

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

const collect = async <T>(stream: AsyncIterable<T>) => {
  const values: T[] = [];
  for await (const value of stream) values.push(value);
  return values;
};

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
  it.each(["constructor", "toString"] as const)(
    "does not inherit a missing %s field before or after completion",
    async (key) => {
      const reader = new ToolCallReaderImpl<
        { constructor?: string; toString?: string },
        string
      >();
      const pending = reader.args.get(key);
      await reader.appendArgsTextDelta("{}");
      await reader.finishArgsText();

      expect(await pending).toBeUndefined();
      expect(await reader.args.get(key)).toBeUndefined();
    },
  );

  it("checks own properties at every nested path segment", async () => {
    const reader = new ToolCallReaderImpl<
      {
        nested: { toString?: string; constructor?: { name: string } };
      },
      string
    >();
    await reader.appendArgsTextDelta('{"nested":{}}');
    await reader.finishArgsText();

    expect(await reader.args.get("nested", "toString")).toBeUndefined();
    expect(
      await reader.args.get("nested", "constructor", "name"),
    ).toBeUndefined();
  });

  it.each(["constructor", "toString"] as const)(
    "preserves an explicitly supplied own %s field",
    async (key) => {
      const reader = new ToolCallReaderImpl<
        { constructor?: string; toString?: string },
        string
      >();
      const pending = reader.args.get(key);
      await reader.appendArgsTextDelta(
        JSON.stringify({ [key]: "actual value" }),
      );
      await reader.finishArgsText();

      expect(await pending).toBe("actual value");
      expect(await reader.args.get(key)).toBe("actual value");
    },
  );

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
  it("does not stream inherited values while arguments are partial or complete", async () => {
    const reader = new ToolCallReaderImpl<
      { toString?: string; nested: { toString?: string } },
      string
    >();
    const values = reader.args.streamValues("toString");
    const nestedValues = reader.args.streamValues("nested", "toString");
    await reader.appendArgsTextDelta('{"nested":{');
    await reader.appendArgsTextDelta("}}");
    await reader.finishArgsText();

    expect(await collect(values)).toEqual([]);
    expect(await collect(nestedValues)).toEqual([]);
    expect(await collect(reader.args.streamValues("toString"))).toEqual([]);
  });

  it("streams an explicitly supplied nested prototype-named field", async () => {
    const reader = new ToolCallReaderImpl<
      { nested: { toString: string } },
      string
    >();
    const values = reader.args.streamValues("nested", "toString");
    await reader.appendArgsTextDelta('{"nested":{"toString":"hel');
    await reader.appendArgsTextDelta('lo"}}');
    await reader.finishArgsText();

    expect(await collect(values)).toEqual(["hel", "hello"]);
  });

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

describe("ToolCallArgsReader.forEach lifecycle", () => {
  it("waits for nested partial elements and emits them once in order", async () => {
    const reader = new ToolCallReaderImpl<
      { items: { label: string; tags: string[] }[] },
      string
    >();
    const values = reader.args.forEach("items").getReader();
    const first = values.read();
    let settled = false;
    void first.then(() => {
      settled = true;
    });

    await reader.appendArgsTextDelta('{"items":[{"label":"hel');
    await reader.appendArgsTextDelta('lo","tags":["a');
    await reader.appendArgsTextDelta('b"]');
    expect(settled).toBe(false);

    await reader.appendArgsTextDelta('},{"label":"second","tags":[');
    expect(await first).toEqual({
      done: false,
      value: { label: "hello", tags: ["ab"] },
    });
    await reader.appendArgsTextDelta("]}]}");
    await reader.finishArgsText();

    expect(await values.read()).toEqual({
      done: false,
      value: { label: "second", tags: [] },
    });
    expect(await values.read()).toEqual({ done: true, value: undefined });
  });

  it("starts late with completed entries and retains the partial tail", async () => {
    const reader = new ToolCallReaderImpl<{ items: string[] }, string>();
    await reader.appendArgsTextDelta('{"items":["first","sec');
    const values = reader.args.forEach("items");
    await reader.appendArgsTextDelta('ond"]}');
    await reader.finishArgsText();

    expect(await collect(values)).toEqual(["first", "second"]);
    expect(await collect(reader.args.forEach("items"))).toEqual([
      "first",
      "second",
    ]);
  });

  it.each(['{"items":[]}', "{}"])(
    "closes without items for %s",
    async (json) => {
      const reader = new ToolCallReaderImpl<{ items?: string[] }, string>();
      const values = reader.args.forEach("items");
      await reader.appendArgsTextDelta(json);
      await reader.finishArgsText();

      expect(await collect(values)).toEqual([]);
    },
  );

  it("cancels one subscriber without dropping another subscriber's items", async () => {
    const reader = new ToolCallReaderImpl<{ items: string[] }, string>();
    const cancelled = reader.args.forEach("items").getReader();
    const active = reader.args.forEach("items");
    await reader.appendArgsTextDelta('{"items":["first",');
    expect(await cancelled.read()).toEqual({ done: false, value: "first" });
    await cancelled.cancel();
    await reader.appendArgsTextDelta('"second"]}');
    await reader.finishArgsText();

    expect(await cancelled.read()).toEqual({ done: true, value: undefined });
    expect(await collect(active)).toEqual(["first", "second"]);
  });

  it("does not emit a partial trailing element when the stream ends", async () => {
    const reader = new ToolCallReaderImpl<{ items: string[] }, string>();
    const values = reader.args.forEach("items");
    await reader.appendArgsTextDelta('{"items":["first","unfinished');
    await reader.finishArgsText();

    expect(await collect(values)).toEqual(["first"]);
  });
});

describe("ToolCallArgsReader termination", () => {
  const failure = new Error("connection reset");

  const argsReader = (deltas: string[], reason?: unknown) => {
    let index = 0;
    return new ToolCallArgsReaderImpl<Args>(
      // Erroring a controller discards its queue, so the deltas are pulled one
      // at a time to reach the reader before the failure.
      new ReadableStream<string>({
        pull(controller) {
          const delta = deltas[index++];
          if (delta !== undefined) {
            controller.enqueue(delta);
          } else if (reason === undefined) {
            controller.close();
          } else {
            controller.error(reason);
          }
        },
      }),
    );
  };

  it("rejects a pending get when the args stream fails mid-payload", async () => {
    const args = argsReader(['{"required":"hel'], failure);

    await expect(args.get("required")).rejects.toBe(failure);
  });

  it("rejects a get requested after the args stream failed", async () => {
    const args = argsReader(['{"required":"hel'], failure);
    await expect(args.get("required")).rejects.toBe(failure);

    await expect(args.get("required")).rejects.toBe(failure);
  });

  it("keeps a field that completed before the failure", async () => {
    const args = argsReader(['{"required":"hello","optional":"par'], failure);

    await expect(args.get("required")).resolves.toBe("hello");
    await expect(args.get("optional")).rejects.toBe(failure);
  });

  it("resolves undefined for an absent field when the stream closes cleanly", async () => {
    const args = argsReader(['{"required":"hello"}']);

    await expect(args.get("optional")).resolves.toBeUndefined();
  });

  it("resolves the value when the stream closes cleanly", async () => {
    const args = argsReader(['{"required":"hel', 'lo"}']);

    await expect(args.get("required")).resolves.toBe("hello");
  });

  it("errors an open streamText when the args stream fails", async () => {
    const args = argsReader(['{"required":"hel'], failure);

    await expect(collect(args.streamText("required"))).rejects.toBe(failure);
  });

  it("errors an open streamValues when the args stream fails", async () => {
    const args = argsReader(['{"required":"hel'], failure);

    await expect(collect(args.streamValues("required"))).rejects.toBe(failure);
  });

  it("errors an open forEach when the args stream fails", async () => {
    const args = argsReader(['{"required":"hi","items":["a"'], failure);

    await expect(collect(args.forEach("items"))).rejects.toBe(failure);
  });
});
