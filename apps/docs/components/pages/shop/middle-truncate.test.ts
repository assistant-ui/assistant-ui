import { describe, expect, it } from "vitest";
import { middleTruncate } from "./middle-truncate";

describe("middleTruncate", () => {
  it("returns text within the budget unchanged", () => {
    expect(middleTruncate("short", 10)).toBe("short");
    expect(middleTruncate("exactly ten", 11)).toBe("exactly ten");
  });

  it("keeps the start and the end around one ellipsis within the budget", () => {
    const text = "The route file streams model output through the AI SDK";
    const result = middleTruncate(text, 21);
    expect(result).toBe("The route…the AI SDK");
    expect(result.length).toBeLessThanOrEqual(21);
  });

  it("trims whitespace touching the ellipsis", () => {
    expect(middleTruncate("aaaa bbbb cccc dddd", 11)).toBe("aaaa…dddd");
  });
});
