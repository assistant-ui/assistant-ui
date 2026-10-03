import { describe, test } from "vitest";
import type { Element } from "hast";
import { areNodesEqual } from "./memoization";

const createNode = (size: number): Element => ({
  type: "element",
  tagName: "code",
  properties: { className: ["language-ts"] },
  children: [{ type: "text", value: "x".repeat(size) }],
});

describe("unchanged streamed code nodes", () => {
  for (const size of [10000, 100000]) {
    const prev = createNode(size);
    const next = createNode(size);
    test(`${size} characters`, async ({ bench }) => {
      await bench(`${size} characters`, () => areNodesEqual(prev, next)).run({
        time: 100,
        iterations: 10,
        warmupTime: 50,
        warmupIterations: 2,
      });
    });
  }
});
