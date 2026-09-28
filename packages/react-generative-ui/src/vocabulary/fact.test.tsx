import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { factVocabulary } from "./fact";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, factVocabulary)}</>);

describe("factVocabulary", () => {
  it("Fact renders a label/value pair inside a dl", () => {
    expect(render({ $type: "Fact", label: "Status", value: "open" })).toBe(
      '<dl data-aui="fact"><dt data-aui="fact-label">Status</dt><dd data-aui="fact-value">open</dd></dl>',
    );
  });

  it("Fact ignores malformed text properties", () => {
    expect(
      render({
        $type: "Fact",
        label: { unexpected: true },
        value: { unexpected: true },
      }),
    ).toBe(
      '<dl data-aui="fact"><dt data-aui="fact-label"></dt><dd data-aui="fact-value"></dd></dl>',
    );
  });

  it("Fact renders a good or bad delta with an arrow", () => {
    expect(
      render({
        $type: "Fact",
        label: "Revenue",
        value: "$12.4k",
        delta: "+8%",
      }),
    ).toContain(
      '<span data-aui="fact-delta" data-aui-trend="up" data-aui-tone="good">↑ 8%</span>',
    );
    expect(
      render({
        $type: "Fact",
        label: "Cost",
        value: "$12.4k",
        delta: "-8%",
        upIsGood: false,
      }),
    ).toContain(
      '<span data-aui="fact-delta" data-aui-trend="down" data-aui-tone="good">↓ 8%</span>',
    );
  });

  it("Fact reads a typographic minus as a downward delta", () => {
    expect(
      render({
        $type: "Fact",
        label: "Latency",
        value: "120 ms",
        delta: "\u22123%",
      }),
    ).toContain('data-aui-trend="down" data-aui-tone="bad">↓ 3%</span>');
  });

  it("Fact infers a zero delta as flat", () => {
    expect(
      render({
        $type: "Fact",
        label: "Revenue",
        value: "$12.4k",
        delta: "+0.0%",
      }),
    ).toContain('data-aui-trend="flat" data-aui-tone="neutral">→ +0.0%</span>');
  });

  it("Fact lets trend override the delta sign and renders flat deltas neutrally", () => {
    expect(
      render({
        $type: "Fact",
        label: "Revenue",
        value: "$12.4k",
        delta: "-8%",
        trend: "up",
      }),
    ).toContain('data-aui-trend="up" data-aui-tone="good">↑ -8%</span>');
    expect(
      render({
        $type: "Fact",
        label: "Revenue",
        value: "$12.4k",
        delta: "0%",
        trend: "flat",
      }),
    ).toContain('data-aui-trend="flat" data-aui-tone="neutral">→ 0%</span>');
  });
});
