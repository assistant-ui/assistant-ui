import { describe, expect, it, vi } from "vitest";
import { getGraphemeAt, textBufferReducer } from "./useTextBuffer";

describe("cursor grapheme lookup", () => {
  it.each(["a", "😀", "👍🏽", "👩‍💻", "🇪🇹", "e\u0301", "\r\n"])(
    "preserves the boundaries of %j",
    (grapheme) => {
      const text = `x${grapheme}y`;
      const end = 1 + grapheme.length;
      expect(getGraphemeAt(text, 1)).toBe(grapheme);
      expect(getGraphemeAt(text, end)).toBe("y");
      for (let offset = 2; offset < end; offset++) {
        expect(getGraphemeAt(text, offset)).toBe("");
      }
      for (let cursorOffset = 2; cursorOffset <= end; cursorOffset++) {
        const state = { text, cursorOffset, preferredColumn: undefined };
        expect(
          textBufferReducer(state, { type: "move-left" }).cursorOffset,
        ).toBe(1);
      }
      const fractional = {
        text,
        cursorOffset: 1.5,
        preferredColumn: undefined,
      };
      expect(
        textBufferReducer(fractional, { type: "move-left" }).cursorOffset,
      ).toBe(1);
      for (let cursorOffset = 1; cursorOffset < end; cursorOffset++) {
        const state = { text, cursorOffset, preferredColumn: undefined };
        expect(
          textBufferReducer(state, { type: "move-right" }).cursorOffset,
        ).toBe(end);
        expect(
          textBufferReducer(state, { type: "set-cursor", cursorOffset })
            .cursorOffset,
        ).toBe(1);
      }
      const start = { text, cursorOffset: 1, preferredColumn: undefined };
      expect(textBufferReducer(start, { type: "delete-forward" }).text).toBe(
        "xy",
      );
      expect(
        textBufferReducer(start, { type: "insert", text: "!" }).cursorOffset,
      ).toBe(2);
      const state = { text, cursorOffset: end, preferredColumn: undefined };
      expect(textBufferReducer(state, { type: "delete-backward" }).text).toBe(
        "xy",
      );
    },
  );

  it("preserves empty and out-of-range lookups", () => {
    for (const text of ["", "x", "😀"]) {
      for (const offset of [-1, 0.5, text.length, text.length + 1]) {
        expect(getGraphemeAt(text, offset)).toBe("");
      }
      const state = { text, cursorOffset: 0, preferredColumn: undefined };
      expect(textBufferReducer(state, { type: "move-left" }).cursorOffset).toBe(
        0,
      );
    }
    const state = { text: "x😀", cursorOffset: 99, preferredColumn: undefined };
    expect(textBufferReducer(state, { type: "move-left" }).cursorOffset).toBe(
      1,
    );
  });

  it.each([128, 8192])(
    "does not iterate over a %i-character prefix to move, edit or render near the end",
    (size) => {
      const prefix = "x".repeat(size);
      const text = `${prefix}😀y`;
      const state = {
        text,
        cursorOffset: text.length - 1,
        preferredColumn: undefined,
      };
      const segment = Intl.Segmenter.prototype.segment;
      let visited = 0;
      const segmentation = vi
        .spyOn(Intl.Segmenter.prototype, "segment")
        .mockImplementation(function (this: Intl.Segmenter, input) {
          const segments = segment.call(this, input);
          const iterate = segments[Symbol.iterator].bind(segments);
          segments[Symbol.iterator] = function* () {
            for (const entry of iterate()) {
              visited++;
              yield entry;
            }
          };
          return segments;
        });
      let cursorOffset: number;
      let grapheme: string;
      let results: ReturnType<typeof textBufferReducer>[] = [];
      try {
        cursorOffset = textBufferReducer(state, {
          type: "move-left",
        }).cursorOffset;
        grapheme = getGraphemeAt(text, cursorOffset);
        const start = { ...state, cursorOffset: size };
        results = [
          textBufferReducer(start, { type: "move-right" }),
          textBufferReducer(start, { type: "insert", text: "!" }),
          textBufferReducer(state, { type: "delete-backward" }),
          textBufferReducer(start, { type: "delete-forward" }),
          textBufferReducer(state, {
            type: "set-cursor",
            cursorOffset: size + 1,
          }),
        ];
      } finally {
        segmentation.mockRestore();
      }
      expect(cursorOffset).toBe(size);
      expect(grapheme).toBe("😀");
      expect(results.map((result) => result.cursorOffset)).toEqual([
        size + 2,
        size + 1,
        size,
        size,
        size,
      ]);
      expect(results.map((result) => result.text.slice(size))).toEqual([
        "😀y",
        "!😀y",
        "y",
        "y",
        "😀y",
      ]);
      for (const result of results)
        expect(result.text.slice(0, size)).toBe(prefix);
      expect(visited).toBe(0);
    },
  );
});
