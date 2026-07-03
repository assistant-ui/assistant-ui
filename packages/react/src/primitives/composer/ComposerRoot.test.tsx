/** @vitest-environment jsdom */
import type * as ComposerSendModule from "./ComposerSend";
import type { MouseEvent } from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveRoot } from "./ComposerRoot";

vi.mock("./ComposerSend", async (importOriginal) => {
  const actual = await importOriginal<typeof ComposerSendModule>();
  return {
    ...actual,
    useComposerSend: () => null,
  };
});

describe("ComposerPrimitiveRoot", () => {
  it("focuses the textarea when primary-button mousedown starts on blank form space", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(document.activeElement).toBe(textarea);
  });

  it("does not move focus to the textarea when mousedown starts on an interactive child", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <button data-testid="interactive-child" type="button">
          Action
        </button>
        <textarea data-testid="composer-input" />
      </ComposerPrimitiveRoot>,
    );
    const button = getByTestId("interactive-child");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(button, { button: 0 });

    expect(document.activeElement).not.toBe(textarea);
  });

  it("does not move focus to the textarea on non-primary mousedown", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 2 });

    expect(document.activeElement).not.toBe(textarea);
  });

  it("focuses a contenteditable composer target when primary-button mousedown starts on blank form space", () => {
    const { getByTestId } = render(
      <ComposerPrimitiveRoot>
        <div data-testid="blank-space">
          <div contentEditable data-testid="composer-input" tabIndex={0} />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const composerInput = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(document.activeElement).toBe(composerInput);
  });

  it("lets consumer onMouseDown prevent the default focus behavior", () => {
    const onMouseDown = vi.fn((event: MouseEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const { getByTestId } = render(
      <ComposerPrimitiveRoot onMouseDown={onMouseDown}>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(textarea);
  });

  it("runs consumer onMouseDown and preserves default focus behavior when it does not prevent default", () => {
    const onMouseDown = vi.fn();
    const { getByTestId } = render(
      <ComposerPrimitiveRoot onMouseDown={onMouseDown}>
        <div data-testid="blank-space">
          <textarea data-testid="composer-input" />
        </div>
      </ComposerPrimitiveRoot>,
    );
    const blankSpace = getByTestId("blank-space");
    const textarea = getByTestId("composer-input");

    fireEvent.mouseDown(blankSpace, { button: 0 });

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(textarea);
  });
});
