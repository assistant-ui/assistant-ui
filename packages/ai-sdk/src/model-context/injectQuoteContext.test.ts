import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { injectQuoteContext } from "./injectQuoteContext";

const textOf = (part: unknown) => (part as { text?: string }).text;

describe("injectQuoteContext", () => {
  it("prepends the quote as a markdown blockquote", () => {
    const out = injectQuoteContext([
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
        metadata: { custom: { quote: { text: "quoted" } } },
      } as unknown as UIMessage,
    ]);
    expect(textOf(out[0]!.parts[0])).toBe("> quoted\n\n");
    expect(textOf(out[0]!.parts[1])).toBe("hello");
  });

  it("does not throw when a user message has no parts", () => {
    const input = [
      {
        id: "m1",
        role: "user",
        metadata: { custom: { quote: { text: "quoted" } } },
      } as unknown as UIMessage,
    ];
    const run = () => injectQuoteContext(input);
    expect(run).not.toThrow();
    expect(textOf(run()[0]!.parts[0])).toBe("> quoted\n\n");
  });
});
