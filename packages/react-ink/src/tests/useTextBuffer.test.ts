import { describe, expect, it } from "vitest";
import {
  createTextBufferState,
  getGraphemeAt,
  textBufferReducer,
  type TextBufferAction,
  type TextBufferState,
} from "../primitives/composer/useTextBuffer";

const reduce = (
  state: TextBufferState,
  ...actions: TextBufferAction[]
): TextBufferState => {
  return actions.reduce(textBufferReducer, state);
};

describe("textBufferReducer", () => {
  it("inserts text at the cursor and advances the cursor", () => {
    const state = reduce(
      createTextBufferState("helo"),
      { type: "set-cursor", cursorOffset: 2 },
      { type: "insert", text: "l" },
    );

    expect(state.text).toBe("hello");
    expect(state.cursorOffset).toBe(3);
  });

  it("deletes backward and forward at the cursor", () => {
    const backward = reduce(
      createTextBufferState("hello"),
      { type: "set-cursor", cursorOffset: 3 },
      { type: "delete-backward" },
    );
    const forward = reduce(
      createTextBufferState("hello"),
      { type: "set-cursor", cursorOffset: 2 },
      { type: "delete-forward" },
    );

    expect(backward.text).toBe("helo");
    expect(backward.cursorOffset).toBe(2);
    expect(forward.text).toBe("helo");
    expect(forward.cursorOffset).toBe(2);
  });

  it("moves home and end across the whole buffer in single-line mode", () => {
    const home = reduce(
      createTextBufferState("hello"),
      { type: "set-cursor", cursorOffset: 4 },
      { type: "move-home", multiLine: false },
    );
    const end = reduce(home, { type: "move-end", multiLine: false });

    expect(home.cursorOffset).toBe(0);
    expect(end.cursorOffset).toBe(5);
  });

  it("moves home and end within the current line in multi-line mode", () => {
    const home = reduce(
      createTextBufferState("one\ntwo\nthree"),
      { type: "set-cursor", cursorOffset: 6 },
      { type: "move-home", multiLine: true },
    );
    const end = reduce(home, { type: "move-end", multiLine: true });

    expect(home.cursorOffset).toBe(4);
    expect(end.cursorOffset).toBe(7);
  });

  it("preserves preferred column when moving vertically", () => {
    const movedUp = reduce(
      createTextBufferState("abcde\nxy\n123456"),
      { type: "set-cursor", cursorOffset: 11 },
      { type: "move-up" },
    );
    const movedDown = reduce(movedUp, { type: "move-down" });

    expect(movedUp.cursorOffset).toBe(8);
    expect(movedDown.cursorOffset).toBe(11);
  });

  it("moves by words and deletes the previous word", () => {
    const movedLeft = reduce(createTextBufferState("alpha beta gamma"), {
      type: "move-word-left",
    });
    const movedRight = reduce(
      createTextBufferState("alpha beta gamma"),
      { type: "set-cursor", cursorOffset: 0 },
      { type: "move-word-right" },
    );
    const killed = reduce(createTextBufferState("alpha beta gamma"), {
      type: "kill-word-backward",
    });

    expect(movedLeft.cursorOffset).toBe(11);
    expect(movedRight.cursorOffset).toBe(5);
    expect(killed.text).toBe("alpha beta ");
    expect(killed.cursorOffset).toBe(11);
  });

  it("joins the next line when killing forward at end-of-line in multi-line mode", () => {
    const state = reduce(
      createTextBufferState("one\ntwo\nthree"),
      { type: "set-cursor", cursorOffset: 3 },
      { type: "kill-end", multiLine: true },
    );

    expect(state.text).toBe("onetwo\nthree");
    expect(state.cursorOffset).toBe(3);
  });

  it("kills to line boundaries in multi-line mode", () => {
    const killStart = reduce(
      createTextBufferState("one\ntwo\nthree"),
      { type: "set-cursor", cursorOffset: 6 },
      { type: "kill-start", multiLine: true },
    );
    const killEnd = reduce(
      createTextBufferState("one\ntwo\nthree"),
      { type: "set-cursor", cursorOffset: 5 },
      { type: "kill-end", multiLine: true },
    );

    expect(killStart.text).toBe("one\no\nthree");
    expect(killStart.cursorOffset).toBe(4);
    expect(killEnd.text).toBe("one\nt\nthree");
    expect(killEnd.cursorOffset).toBe(5);
  });

  it("replaces text from external sync and resets cursor to the end", () => {
    const state = reduce(createTextBufferState("hello"), {
      type: "set-text",
      text: "reset",
    });

    expect(state.text).toBe("reset");
    expect(state.cursorOffset).toBe(5);
  });

  it("does not corrupt the buffer when killing from line start at offset 0", () => {
    const state = reduce(
      createTextBufferState("\nhello"),
      { type: "set-cursor", cursorOffset: 0 },
      { type: "kill-start", multiLine: true },
    );

    expect(state.text).toBe("\nhello");
    expect(state.cursorOffset).toBe(0);
  });

  it("keeps the cursor at column 0 when moving home on a line beginning with a newline", () => {
    const state = reduce(
      createTextBufferState("\nhello"),
      { type: "set-cursor", cursorOffset: 0 },
      { type: "move-home", multiLine: true },
    );

    expect(state.cursorOffset).toBe(0);
  });

  it("steps over surrogate pairs when moving and deleting", () => {
    const emoji = "😀";
    const movedRight = reduce(
      createTextBufferState(`a${emoji}b`),
      { type: "set-cursor", cursorOffset: 1 },
      { type: "move-right" },
    );
    const movedLeft = reduce(
      createTextBufferState(`a${emoji}b`),
      { type: "set-cursor", cursorOffset: 3 },
      { type: "move-left" },
    );
    const deletedBackward = reduce(
      createTextBufferState(`a${emoji}b`),
      { type: "set-cursor", cursorOffset: 3 },
      { type: "delete-backward" },
    );
    const deletedForward = reduce(
      createTextBufferState(`a${emoji}b`),
      { type: "set-cursor", cursorOffset: 1 },
      { type: "delete-forward" },
    );

    expect(movedRight.cursorOffset).toBe(3);
    expect(movedLeft.cursorOffset).toBe(1);
    expect(deletedBackward.text).toBe("ab");
    expect(deletedBackward.cursorOffset).toBe(1);
    expect(deletedForward.text).toBe("ab");
    expect(deletedForward.cursorOffset).toBe(1);
  });

  it("treats grapheme clusters as a single character", () => {
    const skinToned = "👍🏽";
    const deletedBackward = reduce(
      createTextBufferState(`a${skinToned}b`),
      { type: "set-cursor", cursorOffset: 1 + skinToned.length },
      { type: "delete-backward" },
    );
    const deletedForward = reduce(
      createTextBufferState(`a${skinToned}b`),
      { type: "set-cursor", cursorOffset: 1 },
      { type: "delete-forward" },
    );
    const movedRight = reduce(
      createTextBufferState(`a${skinToned}b`),
      { type: "set-cursor", cursorOffset: 1 },
      { type: "move-right" },
    );

    expect(deletedBackward.text).toBe("ab");
    expect(deletedForward.text).toBe("ab");
    expect(movedRight.cursorOffset).toBe(1 + skinToned.length);
  });

  it("returns the full grapheme cluster at an offset", () => {
    expect(getGraphemeAt("ab", 0)).toBe("a");
    expect(getGraphemeAt("a😀b", 1)).toBe("😀");
    expect(getGraphemeAt("a😀b", 3)).toBe("b");
    expect(getGraphemeAt("a", 1)).toBe("");
    expect(getGraphemeAt("a\nb", 1)).toBe("\n");
    expect(getGraphemeAt("👍🏽", 0)).toBe("👍🏽");
  });

  it("advances by ideograph for CJK text without spaces", () => {
    const movedRight = reduce(
      createTextBufferState("你好世界"),
      { type: "set-cursor", cursorOffset: 0 },
      { type: "move-word-right" },
    );

    expect(movedRight.cursorOffset).toBeGreaterThan(0);
    expect(movedRight.cursorOffset).toBeLessThanOrEqual(4);
  });

  it("kills the next word forward", () => {
    const state = reduce(
      createTextBufferState("alpha beta gamma"),
      { type: "set-cursor", cursorOffset: 0 },
      { type: "kill-word-forward" },
    );

    expect(state.text).toBe(" beta gamma");
    expect(state.cursorOffset).toBe(0);
  });
});
