/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { getSelectionMessageId } from "./getSelectionMessageId";

const selectText = (start: Text, end = start) => {
  const selection = window.getSelection();
  expect(selection).not.toBeNull();
  selection?.removeAllRanges();

  const range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, end.data.length);
  selection?.addRange(range);

  return selection as Selection;
};

const textNode = (selector: string) => {
  const node = document.querySelector(selector)?.firstChild;
  expect(node).toBeInstanceOf(Text);
  return node as Text;
};

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

describe("getSelectionMessageId", () => {
  it("accepts selections anywhere in a message without quote regions", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="text">message text</p>
        <div id="tool">tool output</div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#tool")))).toBe(
      "message-1",
    );
  });

  it("accepts selections inside a quote-selectable region", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="text" data-aui-quote-selectable>message text</p>
        <div id="tool">tool output</div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#text")))).toBe(
      "message-1",
    );
  });

  it("rejects selections outside quote-selectable regions when a message opts in", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="text" data-aui-quote-selectable>message text</p>
        <div id="tool">tool output</div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#tool")))).toBeNull();
  });

  it("rejects selections crossing out of a quote-selectable region", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="text" data-aui-quote-selectable>message text</p>
        <div id="tool">tool output</div>
      </div>
    `;

    expect(
      getSelectionMessageId(selectText(textNode("#text"), textNode("#tool"))),
    ).toBeNull();
  });

  it("rejects selections crossing separate quote-selectable regions", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="first" data-aui-quote-selectable>first text</p>
        <div id="tool">tool output</div>
        <p id="second" data-aui-quote-selectable>second text</p>
      </div>
    `;

    expect(
      getSelectionMessageId(
        selectText(textNode("#first"), textNode("#second")),
      ),
    ).toBeNull();
  });

  it("rejects selections across messages", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="first">first text</p>
      </div>
      <div data-message-id="message-2">
        <p id="second">second text</p>
      </div>
    `;

    expect(
      getSelectionMessageId(
        selectText(textNode("#first"), textNode("#second")),
      ),
    ).toBeNull();
  });
});
