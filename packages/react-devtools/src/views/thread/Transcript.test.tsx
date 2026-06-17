import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MessagePreview } from "../message";
import { Transcript, TranscriptHeader } from "./Transcript";
import type { ThreadPreview } from "./types";

const message = (over: Partial<MessagePreview>): MessagePreview => ({
  id: "m",
  role: "assistant",
  parts: [],
  attachments: [],
  ...over,
});

describe("Transcript", () => {
  it("renders a role-lane turn with text, tool chip, and a stat header", () => {
    const thread: ThreadPreview = {
      messages: [
        message({
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "what's the weather?" }],
        }),
        message({
          id: "a1",
          role: "assistant",
          parts: [
            { type: "text", text: "Let me check." },
            {
              type: "tool-call",
              toolCallId: "c1",
              toolName: "getWeather",
              args: {},
              subMessageCount: 0,
            },
            { type: "text", text: "It is sunny." },
          ],
          usage: { inputTokens: 10, outputTokens: 5, stepCount: 1 },
        }),
      ],
      suggestions: [],
      capabilities: [],
    };

    const html = renderToStaticMarkup(
      <>
        <TranscriptHeader thread={thread} />
        <Transcript thread={thread} selection={null} onSelect={() => {}} />
      </>,
    );
    expect(html).toContain("user");
    expect(html).toContain("what&#x27;s the weather?");
    expect(html).toContain("Let me check.");
    expect(html).toContain("2 msgs");
  });
});
