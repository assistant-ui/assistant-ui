import { describe, expect, it } from "vitest";
import { messagePlainText } from "./messagePlainText";
import type { MessagePreview } from "./types";

const message = (parts: MessagePreview["parts"]): MessagePreview => ({
  id: "m1",
  role: "assistant",
  parts,
  attachments: [],
});

describe("messagePlainText", () => {
  it("joins text parts with blank lines", () => {
    expect(
      messagePlainText(
        message([
          { type: "text", text: "Hello" },
          { type: "text", text: "World" },
        ]),
      ),
    ).toBe("Hello\n\nWorld");
  });

  it("includes reasoning and tool blocks", () => {
    const text = messagePlainText(
      message([
        { type: "reasoning", text: "thinking…" },
        {
          type: "tool-call",
          toolCallId: "c1",
          toolName: "getWeather",
          args: { city: "SF" },
          result: { temp: 18 },
          subMessageCount: 0,
        },
        { type: "text", text: "It is 18°." },
      ]),
    );
    expect(text).toContain("thinking…");
    expect(text).toContain("[tool] getWeather");
    expect(text).toContain('"city": "SF"');
    expect(text).toContain("It is 18°.");
  });

  it("returns empty string when there is no copyable content", () => {
    expect(messagePlainText(message([]))).toBe("");
  });
});
