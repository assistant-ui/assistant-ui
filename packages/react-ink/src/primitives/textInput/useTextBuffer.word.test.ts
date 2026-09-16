import { createRenderCounter } from "@assistant-ui/x-performance";
import { describe, expect, it, vi } from "vitest";
import { textBufferReducer } from "./useTextBuffer";

describe("word boundary navigation", () => {
  it.each([10, 10_000])("does not iterate over a %i-word prefix", (size) => {
    const text = "word ".repeat(size) + "final";
    const segment = Intl.Segmenter.prototype.segment;
    const counter = createRenderCounter();
    const spy = vi
      .spyOn(Intl.Segmenter.prototype, "segment")
      .mockImplementation(function (this: Intl.Segmenter, input) {
        const segments = segment.call(this, input);
        if (this.resolvedOptions().granularity !== "word") return segments;
        const iterate = segments[Symbol.iterator].bind(segments);
        const containing = segments.containing.bind(segments);
        segments[Symbol.iterator] = function* () {
          for (const entry of iterate()) {
            counter.useRender("visited");
            yield entry;
          }
          return undefined;
        };
        segments.containing = (index) => {
          counter.useRender("lookup");
          return containing(index);
        };
        return segments;
      });
    try {
      const state = {
        text,
        cursorOffset: text.length - 2,
        preferredColumn: undefined,
      };
      for (const type of [
        "move-word-left",
        "move-word-right",
        "kill-word-backward",
        "kill-word-forward",
      ] as const) {
        counter.reset();
        const result = textBufferReducer(state, { type });
        expect(counter.renders("visited")).toBe(0);
        expect(counter.renders("lookup")).toBe(1);
        expect(result.text).toBe(
          type === "kill-word-backward"
            ? "word ".repeat(size) + "al"
            : type === "kill-word-forward"
              ? text.slice(0, -2)
              : text,
        );
        expect(result.cursorOffset).toBe(
          type.endsWith("left") || type.endsWith("backward")
            ? size * 5
            : type === "move-word-right"
              ? text.length
              : state.cursorOffset,
        );
      }
    } finally {
      spy.mockRestore();
    }
  });

  it.each([
    "",
    "hello world",
    "  hello, ... world!  ",
    "\t\r\n! 😀",
    "don't stop",
    "a\r\nword\r\nb",
    "e\u0301lan cafe\u0301",
    "👩‍💻 hello 👍🏽 world 🇪🇹",
    "你好世界 再见",
    "ภาษาไทย ทดสอบ",
    "مرحبا بالعالم",
  ])("preserves word boundaries and deletion spans in %j", (text) => {
    const segments = [
      ...new Intl.Segmenter(undefined, { granularity: "word" }).segment(text),
    ];
    for (let cursorOffset = 0; cursorOffset <= text.length; cursorOffset++) {
      const before =
        segments
          .filter((entry) => entry.isWordLike && entry.index < cursorOffset)
          .at(-1)?.index ?? 0;
      const next = segments.find(
        (entry) =>
          entry.isWordLike && entry.index + entry.segment.length > cursorOffset,
      );
      const after = next ? next.index + next.segment.length : text.length;
      const state = { text, cursorOffset, preferredColumn: 4 };
      expect(textBufferReducer(state, { type: "move-word-left" })).toEqual({
        ...state,
        cursorOffset: before,
        preferredColumn: undefined,
      });
      expect(textBufferReducer(state, { type: "move-word-right" })).toEqual({
        ...state,
        cursorOffset: after,
        preferredColumn: undefined,
      });
      expect(
        textBufferReducer(state, { type: "kill-word-backward" }).text,
      ).toBe(text.slice(0, before) + text.slice(cursorOffset));
      expect(textBufferReducer(state, { type: "kill-word-forward" }).text).toBe(
        text.slice(0, cursorOffset) + text.slice(after),
      );
    }
  });

  it("preserves fractional and out-of-range movement offsets", () => {
    const text = "one two";
    for (const [cursorOffset, left, right] of [
      [-1, 0, 3],
      [0.5, 0, 3],
      [4.5, 4, 7],
      [7, 4, 7],
      [99, 4, 7],
    ] as const) {
      const state = {
        text,
        cursorOffset,
        preferredColumn: undefined,
      };
      expect(
        textBufferReducer(state, { type: "move-word-left" }).cursorOffset,
      ).toBe(left);
      expect(
        textBufferReducer(state, { type: "move-word-right" }).cursorOffset,
      ).toBe(right);
    }
  });
});
