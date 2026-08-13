import { describe, it, expect } from "vitest";
import { createTapRoot, flushTapSync } from "../../index";
import { useState } from "../../react-hooks/useState";

describe("createTapRoot update errors", () => {
  it("surfaces a throwing update render from the flush and recovers", () => {
    let bump!: (value: number) => void;
    const root = createTapRoot(function BombRoot() {
      const [count, setCount] = useState(0);
      bump = setCount;
      if (count > 0) throw new Error("boom");
      return count;
    });

    expect(root.getValue()).toBe(0);
    expect(() => flushTapSync(() => bump(1))).toThrow("boom");

    flushTapSync(() => bump(0));
    expect(root.getValue()).toBe(0);
    root.unmount();
  });
});
