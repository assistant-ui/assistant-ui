import { describe, expect, it, vi } from "vitest";
import { ToolCallReaderImpl } from "./ToolCallReader";

const fieldStateReads = vi.hoisted(() => vi.fn());

vi.mock(
  "../../utils/json/parse-partial-json-object",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("../../utils/json/parse-partial-json-object")
      >();
    return {
      ...original,
      getPartialJsonObjectFieldState: (
        ...args: Parameters<typeof original.getPartialJsonObjectFieldState>
      ) => {
        fieldStateReads();
        return original.getPartialJsonObjectFieldState(...args);
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

      // One array-state check for the empty array, then one item and one array check per completed item.
      expect(fieldStateReads).toHaveBeenCalledTimes(2 * count + 1);
      expect(await collect(values)).toEqual(
        Array.from({ length: count }, (_, index) => index),
      );
    },
  );
});
