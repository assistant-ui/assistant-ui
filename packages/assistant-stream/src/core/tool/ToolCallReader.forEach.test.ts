import { describe, expect, it, vi } from "vitest";
import { ToolCallReaderImpl } from "./ToolCallReader";

const arrayLengthReads = vi.hoisted(() => vi.fn());

vi.mock("./ToolCallArgsParser", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./ToolCallArgsParser")>();
  return {
    ...original,
    ToolCallArgsParser: class extends original.ToolCallArgsParser {
      override read(text: string) {
        const parsed = super.read(text);
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
      }
    },
  };
});

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

      // One bound check for the empty array, then one to enter and one to exit per completed item.
      expect(arrayLengthReads).toHaveBeenCalledTimes(2 * count + 1);
      expect(await collect(values)).toEqual(
        Array.from({ length: count }, (_, index) => index),
      );
    },
  );
});
