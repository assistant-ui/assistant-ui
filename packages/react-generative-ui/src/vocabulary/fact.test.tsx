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
});
