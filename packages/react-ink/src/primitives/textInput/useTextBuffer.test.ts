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
    "does not iterate over a %i-character prefix to move or render the cursor",
    (size) => {
      const text = `${"x".repeat(size)}😀`;
      const state = {
        text,
        cursorOffset: text.length,
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
      try {
        cursorOffset = textBufferReducer(state, {
          type: "move-left",
        }).cursorOffset;
        grapheme = getGraphemeAt(text, cursorOffset);
      } finally {
        segmentation.mockRestore();
      }
      expect(cursorOffset).toBe(size);
      expect(grapheme).toBe("😀");
      expect(visited).toBe(0);
    },
  );
});
