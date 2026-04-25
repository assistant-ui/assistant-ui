import { describe, expect, it } from "vitest";

describe("chat-test-kit-react", () => {
  it("loads under jsdom", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });
});
