/**
 * @vitest-environment jsdom
 */
import { afterEach, assert, describe, expect, it, vi } from "vitest";
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
  vi.restoreAllMocks();
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

  it("treats the whole message as quotable when the root is the region", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1" data-aui-quote-selectable>
        <p id="text">message text</p>
        <div id="tool">tool output</div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#text")))).toBe(
      "message-1",
    );
    expect(
      getSelectionMessageId(selectText(textNode("#text"), textNode("#tool"))),
    ).toBe("message-1");
  });

  it("disables quoting for the whole message when the root is marked false", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1" data-aui-quote-selectable="false">
        <p id="text">message text</p>
        <div id="tool">tool output</div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#text")))).toBeNull();
    expect(getSelectionMessageId(selectText(textNode("#tool")))).toBeNull();
  });

  it("excludes a false subtree while the rest of the message stays quotable", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="text">message text</p>
        <div id="tool" data-aui-quote-selectable="false">tool output</div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#text")))).toBe(
      "message-1",
    );
    expect(getSelectionMessageId(selectText(textNode("#tool")))).toBeNull();
  });

  it("carves a false region out of a quote-selectable region", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <div data-aui-quote-selectable="">
          <p id="text">message text</p>
          <span id="chip" data-aui-quote-selectable="false">citation chip</span>
        </div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#text")))).toBe(
      "message-1",
    );
    expect(getSelectionMessageId(selectText(textNode("#chip")))).toBeNull();
    expect(
      getSelectionMessageId(selectText(textNode("#text"), textNode("#chip"))),
    ).toBeNull();
  });

  it.each(["", "data-aui-quote-selectable"])(
    "rejects selections spanning an excluded subtree with root %s",
    (marker) => {
      document.body.innerHTML = `
        <div data-message-id="message-1" ${marker}>
          <span id="before">before</span>
          <span data-aui-quote-selectable="false">excluded</span>
          <span id="after">after</span>
        </div>
      `;

      expect(getSelectionMessageId(selectText(textNode("#before")))).toBe(
        "message-1",
      );
      expect(
        getSelectionMessageId(
          selectText(textNode("#before"), textNode("#after")),
        ),
      ).toBeNull();
    },
  );

  it("rejects a paragraph selection that spans an inline exclusion", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="text" data-aui-quote-selectable>before <span data-aui-quote-selectable="false">[1]</span> after</p>
      </div>
    `;

    const paragraph = document.querySelector("#text");
    assert(paragraph);
    const selection = selectText(textNode("#text"));
    selection.getRangeAt(0).selectNodeContents(paragraph);

    expect(getSelectionMessageId(selection)).toBeNull();
  });

  it("accepts selections that stop or start at an excluded node boundary", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1" data-aui-quote-selectable>
        <span id="before">before</span><span id="chip" data-aui-quote-selectable="false">[1]</span><span id="after">after</span>
      </div>
    `;

    const chip = document.querySelector("#chip");
    assert(chip);
    const before = selectText(textNode("#before"));
    before.getRangeAt(0).setEndBefore(chip);
    expect(getSelectionMessageId(before)).toBe("message-1");

    const after = selectText(textNode("#after"));
    after.getRangeAt(0).setStartAfter(chip);
    expect(getSelectionMessageId(after)).toBe("message-1");
  });

  it("preserves a nested quote region inside an excluded subtree", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <div data-aui-quote-selectable="false">
          <p data-aui-quote-selectable>
            <span id="before">before</span>
            <span data-aui-quote-selectable="false">[1]</span>
            <span id="after">after</span>
          </p>
        </div>
      </div>
    `;

    expect(getSelectionMessageId(selectText(textNode("#before")))).toBe(
      "message-1",
    );
    expect(
      getSelectionMessageId(
        selectText(textNode("#before"), textNode("#after")),
      ),
    ).toBeNull();
  });

  it("checks another range outside the active quote region, including its excluded ancestor", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <p id="other">before <span id="chip" data-aui-quote-selectable="false">[1]</span> after</p>
        <p id="active" data-aui-quote-selectable>active text</p>
      </div>
    `;

    const other = document.querySelector("#other");
    assert(other);
    const range = document.createRange();
    range.selectNodeContents(other);
    const selection = selectText(textNode("#active"));
    const active = selection.getRangeAt(0);
    vi.spyOn(selection, "rangeCount", "get").mockReturnValue(2);
    vi.spyOn(selection, "getRangeAt").mockImplementation((index) => {
      if (index === 0) return range;
      if (index === 1) return active;
      throw new DOMException("Range index out of bounds", "IndexSizeError");
    });

    expect(getSelectionMessageId(selection)).toBeNull();

    range.selectNodeContents(textNode("#chip"));
    expect(getSelectionMessageId(selection)).toBeNull();
  });

  it("rejects another range inside the excluded ancestor of the active quote region", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1">
        <div data-aui-quote-selectable="false">
          <span id="sibling">excluded prose</span>
          <p id="active" data-aui-quote-selectable>active text</p>
        </div>
      </div>
    `;

    const range = document.createRange();
    range.selectNodeContents(textNode("#sibling"));
    const selection = selectText(textNode("#active"));
    const active = selection.getRangeAt(0);
    vi.spyOn(selection, "rangeCount", "get").mockReturnValue(2);
    vi.spyOn(selection, "getRangeAt").mockImplementation((index) => {
      if (index === 0) return range;
      if (index === 1) return active;
      throw new DOMException("Range index out of bounds", "IndexSizeError");
    });

    expect(getSelectionMessageId(selection)).toBeNull();
  });

  it("rejects another range in a different message", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1"><p id="active">active text</p></div>
      <div data-message-id="message-2">
        <p id="other" data-aui-quote-selectable="false">excluded prose</p>
      </div>
    `;

    const range = document.createRange();
    range.selectNodeContents(textNode("#other"));
    const selection = selectText(textNode("#active"));
    const active = selection.getRangeAt(0);
    vi.spyOn(selection, "rangeCount", "get").mockReturnValue(2);
    vi.spyOn(selection, "getRangeAt").mockImplementation((index) => {
      if (index === 0) return range;
      if (index === 1) return active;
      throw new DOMException("Range index out of bounds", "IndexSizeError");
    });

    expect(getSelectionMessageId(selection)).toBeNull();
  });

  it("accepts disjoint ranges on either side of an excluded gap", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1" data-aui-quote-selectable>
        <p id="before">before</p>
        <p data-aui-quote-selectable="false">excluded</p>
        <p id="after">after</p>
      </div>
    `;

    const before = document.createRange();
    before.selectNodeContents(textNode("#before"));
    const selection = selectText(textNode("#after"));
    const after = selection.getRangeAt(0);
    vi.spyOn(selection, "rangeCount", "get").mockReturnValue(2);
    vi.spyOn(selection, "getRangeAt").mockImplementation((index) => {
      if (index === 0) return before;
      if (index === 1) return after;
      throw new DOMException("Range index out of bounds", "IndexSizeError");
    });

    expect(getSelectionMessageId(selection)).toBe("message-1");
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
