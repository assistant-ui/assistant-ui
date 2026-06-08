import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageItem } from "./MessageItem";
import { MessageList } from "./MessageList";
import { parseMessage } from "./parse";
import type { MessagePreview } from "./types";

const parsed = (value: unknown): MessagePreview => {
  const message = parseMessage(value, 0);
  if (!message) throw new Error("fixture failed to parse");
  return message;
};

describe("MessageItem rendering", () => {
  it("renders reasoning + tool-call grouped as chain of thought, plus answer", () => {
    const message = parsed({
      id: "m1",
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      branchNumber: 1,
      branchCount: 2,
      parts: [
        {
          type: "reasoning",
          text: "let me think",
          status: { type: "complete" },
        },
        {
          type: "tool-call",
          toolCallId: "c1",
          toolName: "getWeather",
          args: { city: "SF" },
          result: { temp: 18 },
          status: { type: "complete" },
        },
        {
          type: "text",
          text: "It is 18 degrees.",
          status: { type: "complete" },
        },
      ],
      metadata: {
        timing: {
          streamStartTime: 0,
          firstTokenTime: 150,
          totalStreamTime: 900,
        },
        steps: [{ usage: { inputTokens: 50, outputTokens: 12 } }],
        custom: {},
      },
    });

    const html = renderToStaticMarkup(<MessageItem message={message} />);
    expect(html).toContain("getWeather");
    expect(html).toContain("Chain of thought");
    expect(html).toContain("It is 18 degrees.");
    expect(html).toContain("branch 1/2");
    expect(html).toContain("TTFT");
  });

  it("renders a pending approval gate prominently", () => {
    const message = parsed({
      id: "m2",
      role: "assistant",
      status: { type: "requires-action", reason: "tool-calls" },
      parts: [
        {
          type: "tool-call",
          toolCallId: "c2",
          toolName: "deleteAll",
          args: {},
          approval: { id: "appr_9" },
          status: { type: "requires-action", reason: "interrupt" },
        },
      ],
      metadata: { custom: {} },
    });

    const html = renderToStaticMarkup(<MessageItem message={message} />);
    expect(html).toContain("Awaiting approval");
    expect(html).toContain("appr_9");
  });

  it("renders an empty message list placeholder", () => {
    const html = renderToStaticMarkup(<MessageList messages={[]} />);
    expect(html).toContain("No messages");
  });
});
