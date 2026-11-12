import { describe, expect, it } from "vitest";
import { rewriteValue } from "./css.js";

describe("rewriteValue", () => {
  it("makes vh mean the slot", () => {
    expect(rewriteValue("min-height", "100vh")).toBe(
      "var(--rc-auto-min, calc(100 * var(--rc-vh)))",
    );
    expect(rewriteValue("height", "calc(100dvh - 2rem)")).toBe(
      "var(--rc-auto-h, calc(calc(100 * var(--rc-vh)) - 2rem))",
    );
    expect(rewriteValue("padding", "5vh 1rem")).toBe(
      "calc(5 * var(--rc-vh)) 1rem",
    );
  });

  it("makes container units follow the host container", () => {
    expect(rewriteValue("width", "50cqw")).toBe(
      "calc(50 * var(--rc-cqw, 1cqw))",
    );
    expect(rewriteValue("font-size", "clamp(1rem, 4cqi, 2rem)")).toBe(
      "clamp(1rem, calc(4 * var(--rc-cqi, 1cqi)), 2rem)",
    );
  });

  it("leaves everything else alone, and is idempotent", () => {
    expect(rewriteValue("width", "100vw")).toBeNull();
    expect(rewriteValue("grid-template-areas", '"hvh"')).toBeNull();
    expect(rewriteValue("height", rewriteValue("height", "100vh")!)).toBeNull();
  });
});
