import { describe, expect, it } from "vitest";
import { hasMessageId } from "./hasMessageId";

describe("hasMessageId", () => {
  it("finds ids and reuses the cache for the same array", () => {
    let reads = 0;
    const messages = [
      {
        get id() {
          reads++;
          return "first";
        },
      },
    ];

    expect(hasMessageId(messages, "first")).toBe(true);
    expect(hasMessageId(messages, "missing")).toBe(false);
    expect(hasMessageId(messages, "first")).toBe(true);
    expect(reads).toBe(1);
  });

  it("rebuilds the cache for a replacement array", () => {
    const before = [{ id: "first" }];
    const after = [{ id: "second" }];

    expect(hasMessageId(before, "first")).toBe(true);
    expect(hasMessageId(after, "first")).toBe(false);
    expect(hasMessageId(after, "second")).toBe(true);
    expect(hasMessageId(before, "second")).toBe(false);
  });
});
