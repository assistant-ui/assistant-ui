// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getThreadShortcut } from "./thread-shortcuts";

describe("thread shortcuts", () => {
  it.each([
    ["KeyO", "Ø", "new"],
    ["KeyR", "‰", "rename"],
    ["KeyX", "˛", "archive"],
    ["KeyH", "Ó", "sidebar"],
    ["KeyP", "∏", "pin"],
    ["KeyC", "Ç", "composer"],
  ])("handles Alt+Shift+%s as %s for %s", (code, key, command) => {
    expect(
      getThreadShortcut(
        new KeyboardEvent("keydown", {
          key,
          code,
          altKey: true,
          shiftKey: true,
        }),
      ),
    ).toBe(command);
  });

  it.each(["ctrlKey", "metaKey"])(
    "leaves browser-owned %s shortcuts untouched",
    (modifier) => {
      for (const key of ["O", "R", "A", "B", "P"]) {
        expect(
          getThreadShortcut(
            new KeyboardEvent("keydown", {
              key,
              code: `Key${key}`,
              shiftKey: true,
              [modifier]: true,
            }),
          ),
        ).toBeUndefined();
      }
    },
  );

  it("leaves browser toolbar, split-view, and task-manager shortcuts untouched", () => {
    for (const key of ["A", "B", "I", "N", "T"]) {
      expect(
        getThreadShortcut(
          new KeyboardEvent("keydown", {
            key,
            code: `Key${key}`,
            altKey: true,
            shiftKey: true,
          }),
        ),
      ).toBeUndefined();
    }
    expect(
      getThreadShortcut(
        new KeyboardEvent("keydown", {
          key: "Escape",
          shiftKey: true,
        }),
      ),
    ).toBeUndefined();
  });

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
            key: "˛",
            code: "KeyX",
            altKey: true,
            shiftKey: true,
            ...extra,
          }),
        ),
      ).toBeUndefined();
    }
    const event = new KeyboardEvent("keydown", {
      key: "‰",
      code: "KeyR",
      altKey: true,
      shiftKey: true,
      cancelable: true,
    });
    event.preventDefault();
    expect(getThreadShortcut(event)).toBeUndefined();
  });
});
