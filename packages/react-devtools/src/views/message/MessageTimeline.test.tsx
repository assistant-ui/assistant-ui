// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MessageTimeline,
  messageStepCount,
  messageToolCount,
} from "./MessageTimeline";
import type { PartPreview } from "./types";

const part = (over: PartPreview): PartPreview => over;

describe("MessageTimeline", () => {
  it("renders interleaved tool/text parts in order", () => {
    const parts: PartPreview[] = [
      part({
        type: "tool-call",
        toolCallId: "c1",
        toolName: "search",
        args: { q: "a" },
        subMessageCount: 0,
      }),
      part({ type: "text", text: "First chunk." }),
      part({
        type: "tool-call",
        toolCallId: "c2",
        toolName: "lookup",
        args: { id: "b" },
        subMessageCount: 0,
      }),
      part({ type: "text", text: "Final reply." }),
    ];

    const html = renderToStaticMarkup(<MessageTimeline parts={parts} />);
    expect(html).toMatch(
      />search<.*>First chunk\.<.*>lookup<.*>Final reply\.</s,
    );
    expect(html).not.toContain(">cot<");
    expect(html).not.toMatch(/>answer</);
  });

  it("groups reasoning+tool prefix as chain of thought before body", () => {
    const parts: PartPreview[] = [
      part({ type: "reasoning", text: "thinking…" }),
      part({
        type: "tool-call",
        toolCallId: "c1",
        toolName: "getWeather",
        args: {},
        subMessageCount: 0,
      }),
      part({ type: "text", text: "It is sunny." }),
    ];

    const html = renderToStaticMarkup(<MessageTimeline parts={parts} />);
    const timeline = new DOMParser().parseFromString(html, "text/html").body;
    const group = timeline.querySelector("details");
    expect(group?.querySelector("summary")?.textContent).toContain("cot");
    expect(group?.textContent).toMatch(/thinking….*getWeather/s);
    expect(group?.textContent).not.toContain("It is sunny.");
    expect(
      timeline.textContent.match(/thinking…|getWeather|It is sunny\./g),
    ).toEqual(["thinking…", "getWeather", "It is sunny."]);
  });
});

describe("messageStepCount", () => {
  it("counts tools and text parts", () => {
    const parts: PartPreview[] = [
      part({
        type: "tool-call",
        toolCallId: "c1",
        toolName: "a",
        args: {},
        subMessageCount: 0,
      }),
      part({ type: "text", text: "one" }),
      part({
        type: "tool-call",
        toolCallId: "c2",
        toolName: "b",
        args: {},
        subMessageCount: 0,
      }),
      part({ type: "text", text: "two" }),
    ];
    expect(messageStepCount(parts)).toEqual({ tools: 2, texts: 2 });
    expect(messageToolCount(parts)).toBe(2);
  });
});
