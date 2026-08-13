import { describe, it, expect, vi } from "vitest";
import { createTapRoot, flushTapSync } from "../../index";
import { useState } from "../../react-hooks/useState";

describe("createTapRoot update errors", () => {
  it("surfaces a throwing update render from the flush and recovers", () => {
    let bump!: (value: number) => void;
    const root = createTapRoot(function BombRoot() {
      const [count, setCount] = useState(0);
      bump = setCount;
      if (count === 1) throw new Error("boom");
      return count;
    });

    expect(root.getValue()).toBe(0);
    expect(() => flushTapSync(() => bump(1))).toThrow("boom");
    expect(root.getValue()).toBe(0);

    const listener = vi.fn();
    root.subscribe(listener);
    flushTapSync(() => bump(2));
    expect(root.getValue()).toBe(2);
    expect(listener).toHaveBeenCalled();
    root.unmount();
  });
});
