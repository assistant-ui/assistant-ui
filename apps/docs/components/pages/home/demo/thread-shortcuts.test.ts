// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getThreadShortcut } from "./thread-shortcuts";

describe("thread shortcuts", () => {
  it("pins with Alt+Shift+P and leaves private-window shortcuts to the browser", () => {
    expect(
      getThreadShortcut(
        new KeyboardEvent("keydown", {
          key: "∏",
          code: "KeyP",
          altKey: true,
          shiftKey: true,
        }),
      ),
    ).toBe("pin");
    for (const modifier of ["ctrlKey", "metaKey"])
      expect(
        getThreadShortcut(
          new KeyboardEvent("keydown", {
            key: "P",
            code: "KeyP",
            shiftKey: true,
            [modifier]: true,
          }),
        ),
      ).toBeUndefined();
  });

  it.each(["ctrlKey", "metaKey"])(
    "supports %s for thread actions",
    (modifier) => {
      for (const [key, command] of Object.entries({
        O: "new",
        R: "rename",
        A: "archive",
        B: "sidebar",
      })) {
        expect(
          getThreadShortcut(
            new KeyboardEvent("keydown", {
              key,
              shiftKey: true,
              [modifier]: true,
            }),
          ),
        ).toBe(command);
      }
    },
  );

  it("switches threads without consuming ordinary arrows or text editing", () => {
    expect(
      getThreadShortcut(
        new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true }),
      ),
    ).toBe("previous");
    expect(
      getThreadShortcut(
        new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true }),
      ),
    ).toBe("next");
    for (const key of ["ArrowUp", "ArrowDown", "r", "a", "p", "b"])
      expect(
        getThreadShortcut(new KeyboardEvent("keydown", { key })),
      ).toBeUndefined();
    expect(
      getThreadShortcut(
        new KeyboardEvent("keydown", { key: "a", ctrlKey: true }),
      ),
    ).toBeUndefined();
  });

  it("ignores composition, repeats, and handled events", () => {
    for (const extra of [{ isComposing: true }, { repeat: true }]) {
      expect(
        getThreadShortcut(
          new KeyboardEvent("keydown", {
            key: "a",
            ctrlKey: true,
            shiftKey: true,
            ...extra,
          }),
        ),
      ).toBeUndefined();
    }
    const event = new KeyboardEvent("keydown", {
      key: "r",
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    });
    event.preventDefault();
    expect(getThreadShortcut(event)).toBeUndefined();
  });
});
