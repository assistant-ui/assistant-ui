import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

describe("useIsomorphicLayoutEffect", () => {
  it("uses a passive effect when the DOM is unavailable", () => {
    expect(typeof window).toBe("undefined");
    expect(useIsomorphicLayoutEffect).toBe(useEffect);
  });
});
