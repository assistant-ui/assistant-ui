import { describe, expect, it, vi } from "vitest";
import { ToolCallReaderImpl } from "./ToolCallReader";

const arrayLengthReads = vi.hoisted(() => vi.fn());

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
        const parsed = original.parsePartialJsonObject(...args);
        if (parsed && Array.isArray(parsed.items)) {
          return {
            ...parsed,
            items: new Proxy(parsed.items, {
              get(target, key, receiver) {
                if (key === "length") arrayLengthReads();
                return Reflect.get(target, key, receiver);
              },
            }),
          };
        }
        return parsed;
      },
    };
  },
);

const collect = async <T>(stream: AsyncIterable<T>) => {
  const values: T[] = [];
  for await (const value of stream) values.push(value);
  return values;
};

describe("ToolCallArgsReader.forEach", () => {
  it.each([100, 1000])(
    "visits only the unfinished suffix across %i chunks",
    async (count) => {
      const reader = new ToolCallReaderImpl<{ items: number[] }, string>();
      const values = reader.args.forEach("items");
      await reader.appendArgsTextDelta('{"items":[');
      for (let index = 0; index < count; index++) {
        await reader.appendArgsTextDelta(
          String(index) + (index === count - 1 ? "]}" : ","),
        );
      }
      await reader.finishArgsText();

      expect(arrayLengthReads).toHaveBeenCalledTimes(2 * count + 1);
      expect(await collect(values)).toEqual(
        Array.from({ length: count }, (_, index) => index),
      );
    },
  );

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
