import { describe, expect, it } from "vitest";
import { getMessagePartKeys } from "./getMessagePartKeys";

describe("getMessagePartKeys", () => {
  it("reuses the keys array for an unchanged parts array", () => {
    const parts = [{ type: "text" as const, text: "first" }];
    const keys = getMessagePartKeys(parts);

    expect(getMessagePartKeys(parts)).toBe(keys);
    expect(getMessagePartKeys([...parts])).not.toBe(keys);
  });
});
