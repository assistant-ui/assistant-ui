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
  it.each([false, true])(
    "accepts an end at the next message's first text offset zero (backward: %s)",
    (backward) => {
      document.body.innerHTML =
        '<div data-message-id="message-1"><p id="first" data-aui-quote-selectable>first text</p></div><div data-message-id="message-2"><p data-aui-quote-selectable><span id="second">second text</span></p></div>';
      const first = textNode("#first");
      const second = textNode("#second");
      const selection = selectText(first);
      if (backward) {
        selection.setBaseAndExtent(second, 0, first, 1);
      } else {
        selection.setBaseAndExtent(first, 1, second, 0);
      }
      const endpoints = [
        selection.anchorNode,
        selection.anchorOffset,
        selection.focusNode,
        selection.focusOffset,
      ];
      const text = selection.toString();

      expect(getSelectionMessageId(selection)).toBe("message-1");
      expect(selection.toString()).toBe(text);
      expect([
        selection.anchorNode,
        selection.anchorOffset,
        selection.focusNode,
        selection.focusOffset,
      ]).toEqual(endpoints);
    },
  );

  it("accepts an end at the next message element's offset zero", () => {
    document.body.innerHTML =
      '<div data-message-id="message-1"><p id="first" data-aui-quote-selectable>first text</p></div><div id="second" data-message-id="message-2"><p>second text</p></div>';
    const selection = selectText(textNode("#first"));
    const second = document.querySelector("#second");
    assert(second);
    selection.getRangeAt(0).setEnd(second, 0);

    expect(getSelectionMessageId(selection)).toBe("message-1");
  });

  it.each([false, true])(
    "accepts a zero-offset end inside an excluded next message (backward: %s)",
    (backward) => {
      document.body.innerHTML =
        '<div data-message-id="message-1"><p id="first" data-aui-quote-selectable>first text</p></div><div data-message-id="message-2" data-aui-quote-selectable="false"><p><span id="second">second text</span></p></div>';
      const first = textNode("#first");
      const second = textNode("#second");
      const selection = selectText(first);
      selection.setBaseAndExtent(
        backward ? second : first,
        0,
        backward ? first : second,
        0,
      );
      const endpoints = [
        selection.anchorNode,
        selection.anchorOffset,
        selection.focusNode,
        selection.focusOffset,
      ];
      const text = selection.toString();

      expect(getSelectionMessageId(selection)).toBe("message-1");
      expect(selection.toString()).toBe(text);
      expect([
        selection.anchorNode,
        selection.anchorOffset,
        selection.focusNode,
        selection.focusOffset,
      ]).toEqual(endpoints);
    },
  );

  it.each(["<span></span>", "<span> </span>", "<span>excluded text</span>"])(
    "rejects selected content inheriting the next message's exclusion: %s",
    (prefix) => {
      document.body.innerHTML = `<div data-message-id="message-1"><p id="first" data-aui-quote-selectable>first text</p></div><div data-message-id="message-2" data-aui-quote-selectable="false">${prefix}<p id="second">second text</p></div>`;
      const first = textNode("#first");
      const second = textNode("#second");
      const selection = selectText(first);
      for (const backward of [false, true]) {
        selection.setBaseAndExtent(
          backward ? second : first,
          0,
          backward ? first : second,
          0,
        );
        expect(getSelectionMessageId(selection)).toBeNull();
      }
    },
  );

  it.each([
    { footer: "", separator: "", prefix: "<span></span>" },
    { footer: "", separator: "\n  ", prefix: "" },
    {
      footer: '<div class="footer"><button><svg></svg></button></div>',
      separator: "",
      prefix: "",
    },
    {
      footer: "<div><span></span></div>",
      separator: "\n",
      prefix: "<span></span>\n",
    },
  ])(
    "skips empty chrome and whitespace at the end: %j",
    ({ footer, separator, prefix }) => {
      document.body.innerHTML = `<div data-message-id="message-1"><p id="first" data-aui-quote-selectable>first text</p>${footer}</div>${separator}<div data-message-id="message-2">${prefix}<p id="second">second text</p></div>`;
      const first = textNode("#first");
      const second = textNode("#second");
      const selection = selectText(first);
      for (const backward of [false, true]) {
        selection.setBaseAndExtent(
          backward ? second : first,
          backward ? 0 : 1,
          backward ? first : second,
          backward ? 1 : 0,
        );
        const endpoints = [
          selection.anchorNode,
          selection.anchorOffset,
          selection.focusNode,
          selection.focusOffset,
        ];
        const text = selection.toString();
        expect(getSelectionMessageId(selection)).toBe("message-1");
        expect(selection.toString()).toBe(text);
        expect([
          selection.anchorNode,
          selection.anchorOffset,
          selection.focusNode,
          selection.focusOffset,
        ]).toEqual(endpoints);
      }
    },
  );

  it.each([
    { footer: "<footer>footer text</footer>", prefix: "" },
    { footer: "", prefix: "<header>next message header</header>" },
    {
      footer: '<div data-aui-quote-selectable="false"><span></span>\n</div>',
      prefix: "",
    },
    {
      footer: "",
      prefix: '<div data-aui-quote-selectable="false"><span></span>\n</div>',
    },
  ])(
    "does not trim selected content or exclusions: %j",
    ({ footer, prefix }) => {
      document.body.innerHTML = `<div data-message-id="message-1"><p id="first" data-aui-quote-selectable>first text</p>${footer}</div>\n<div data-message-id="message-2">${prefix}<p id="second">second text</p></div>`;
      const selection = selectText(textNode("#first"));
      selection.getRangeAt(0).setEnd(textNode("#second"), 0);
      expect(getSelectionMessageId(selection)).toBeNull();
    },
  );

  it("does not normalize past the selection start", () => {
    document.body.innerHTML =
      '<div data-message-id="message-1"><p id="first">first text</p><span></span></div><div data-message-id="message-2"><p id="second">second text</p></div>';
    const first = textNode("#first");
    const selection = selectText(first);
    selection.setBaseAndExtent(first, first.length, textNode("#second"), 0);
    expect(getSelectionMessageId(selection)).toBeNull();
  });

  it.each(["<span>\n </span>", "<span></span>"])(
    "preserves inherited exclusions after a nested opt-in: %s",
    (suffix) => {
      document.body.innerHTML = `<div data-message-id="message-1"><div data-aui-quote-selectable="false"><p id="first" data-aui-quote-selectable>first text</p>${suffix}</div></div><div data-message-id="message-2"><p id="second">second text</p></div>`;
      const first = textNode("#first");
      const second = textNode("#second");
      const selection = selectText(first);
      expect(getSelectionMessageId(selection)).toBe("message-1");
      for (const backward of [false, true]) {
        selection.setBaseAndExtent(
          backward ? second : first,
          0,
          backward ? first : second,
          0,
        );
        expect(getSelectionMessageId(selection)).toBeNull();
      }
    },
  );

  it("rejects even one selected character in the next message", () => {
    document.body.innerHTML =
      '<div data-message-id="message-1"><p id="first">first text</p></div><div data-message-id="message-2"><p id="second">second text</p></div>';
    const selection = selectText(textNode("#first"));
    selection.getRangeAt(0).setEnd(textNode("#second"), 1);

    expect(getSelectionMessageId(selection)).toBeNull();
  });

  it.each(["", '<span aria-hidden="true"></span>'])(
    "rejects an empty excluded subtree before a zero-offset end with suffix %s",
    (suffix) => {
      document.body.innerHTML = `<div data-message-id="message-1" data-aui-quote-selectable><p id="first">first text</p><span data-aui-quote-selectable="false"></span>${suffix}</div><div data-message-id="message-2"><p id="second">second text</p></div>`;
      const selection = selectText(textNode("#first"));
      selection.getRangeAt(0).setEnd(textNode("#second"), 0);

      expect(getSelectionMessageId(selection)).toBeNull();
    },
  );

  it("rejects an excluded subtree preceding the next message's text", () => {
    document.body.innerHTML =
      '<div data-message-id="message-1"><p id="first">first text</p></div><div data-message-id="message-2"><span data-aui-quote-selectable="false"></span><p id="second">second text</p></div>';
    const selection = selectText(textNode("#first"));
    selection.getRangeAt(0).setEnd(textNode("#second"), 0);

    expect(getSelectionMessageId(selection)).toBeNull();
  });

  it("still checks thread ownership after adjusting a zero-offset end", () => {
    document.body.innerHTML =
      '<div id="first-thread"><div data-message-id="message-1"><p id="first">first text</p></div><div data-message-id="message-2"><p id="second">second text</p></div></div><div id="second-thread"></div>';
    const selection = selectText(textNode("#first"));
    selection.getRangeAt(0).setEnd(textNode("#second"), 0);
    const root = document.querySelector("#second-thread");
    assert(root);

    expect(getSelectionMessageId(selection, root)).toBeNull();
  });

  it("rejects a message outside the supplied thread root", () => {
    document.body.innerHTML = `
      <div id="first-thread">
        <div data-message-id="message-1"><p id="first">first</p></div>
      </div>
      <div id="second-thread">
        <div data-message-id="message-1"><p>second</p></div>
      </div>
    `;
    const firstThread = document.querySelector("#first-thread");
    const secondThread = document.querySelector("#second-thread");
    assert(firstThread);
    assert(secondThread);
    const selection = selectText(textNode("#first"));

    expect(getSelectionMessageId(selection, firstThread)).toBe("message-1");
    expect(getSelectionMessageId(selection, secondThread)).toBeNull();
  });

  it("falls back to an unscoped selection when a declared root has no element", () => {
    document.body.innerHTML = `
      <div data-message-id="message-1"><p id="text">text</p></div>
    `;
    const selection = selectText(textNode("#text"));

    expect(getSelectionMessageId(selection, null)).toBe("message-1");
  });

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
