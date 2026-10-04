import { renderToStaticMarkup } from "react-dom/server";
import { createRenderCounter } from "@assistant-ui/x-performance";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JSONTree } from "./JSONTree";

afterEach(() => vi.restoreAllMocks());

function trackedValue(size: number, array: boolean) {
  const counter = createRenderCounter();
  const value: Record<string, unknown> | unknown[] = array ? [] : {};
  for (let index = 0; index < size; index++) {
    Object.defineProperty(value, String(index), {
      enumerable: true,
      get: () => {
        counter.useRender("entry");
        return index;
      },
    });
  }
  const stringify = JSON.stringify;
  vi.spyOn(JSON, "stringify").mockImplementation((...args) => {
    if (args[0] === value) counter.useRender("serialization");
    return Reflect.apply(stringify, JSON, args);
  });
  return { value, counter };
}

describe("JSONTree work bounds", () => {
  it.each([false, true])(
    "does not read a collapsed array in compact=%s",
    (compact) => {
      const { value, counter } = trackedValue(10_000, true);
      const html = renderToStaticMarkup(
        <JSONTree value={value} openDepth={0} compact={compact} />,
      );
      expect(html).toContain("[10000]");
      expect(counter.renders("entry")).toBe(0);
      expect(counter.renders("serialization")).toBe(0);
    },
  );

  it("does not read a collapsed object's values", () => {
    const { value, counter } = trackedValue(10_000, false);
    const html = renderToStaticMarkup(<JSONTree value={value} openDepth={0} />);
    expect(html).toContain("{10000}");
    expect(counter.renders("entry")).toBe(0);
    expect(counter.renders("serialization")).toBe(0);
  });

  it.each([false, true])(
    "reads only the first 100 entries for array=%s",
    (array) => {
      const { value, counter } = trackedValue(10_000, array);
      const html = renderToStaticMarkup(<JSONTree value={value} />);
      expect(html).toContain("9900");
      expect(counter.renders("entry")).toBe(100);
      expect(counter.renders("serialization")).toBe(0);
    },
  );
});
