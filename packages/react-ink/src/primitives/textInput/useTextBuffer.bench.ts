import { describe, test } from "vitest";
import { getGraphemeAt, textBufferReducer } from "./useTextBuffer";

describe("terminal cursor near the end of a long prompt", () => {
  for (const size of [10_000, 100_000, 1_000_000]) {
    const text = "x".repeat(size);
    const state = { text, cursorOffset: size, preferredColumn: undefined };
    test(`${size} characters`, async ({ bench }) => {
      await bench(`${size} characters`, () => {
        const moved = textBufferReducer(state, { type: "move-left" });
        getGraphemeAt(text, moved.cursorOffset);
      }).run();
    });
    const nearEnd = { ...state, cursorOffset: size - 1 };
    test(`${size} characters, editing before the end`, async ({ bench }) => {
      await bench(`${size} characters, editing before the end`, () => {
        textBufferReducer(nearEnd, { type: "move-right" });
        textBufferReducer(nearEnd, { type: "insert", text: "!" });
        textBufferReducer(nearEnd, { type: "delete-backward" });
        getGraphemeAt(text, nearEnd.cursorOffset);
      }).run();
    });
  }
});
