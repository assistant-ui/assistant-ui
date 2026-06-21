/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ComposerState = { isEditing: boolean; text: string };

const fixture = {
  composer: { isEditing: true, text: "hello" } as ComposerState,
  threadDisabled: false,
  dictationInputDisabled: undefined as boolean | undefined,
  sendDisabled: false,
  activeAria: null as { popoverId: string; highlightedItemId?: string } | null,
};

const composerSetText = vi.fn();
const composerSend = vi.fn();
const flushTapSync = vi.fn((fn: () => void) => fn());

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    composer: () => ({
      getState: () => ({ isEditing: fixture.composer.isEditing }),
      setText: composerSetText,
      send: composerSend,
    }),
  }),
  useAuiState: (selector: (s: unknown) => unknown) =>
    selector({
      composer: {
        isEditing: fixture.composer.isEditing,
        text: fixture.composer.text,
        dictation: fixture.dictationInputDisabled
          ? { inputDisabled: fixture.dictationInputDisabled }
          : undefined,
      },
      thread: { isDisabled: fixture.threadDisabled },
    }),
}));
vi.mock("@assistant-ui/tap", () => ({
  flushTapSync: (fn: () => void) => flushTapSync(fn),
}));
vi.mock("@assistant-ui/core/react", () => ({
  useComposerSend: () => ({
    send: composerSend,
    disabled: fixture.sendDisabled,
  }),
}));
vi.mock("../primitives/composer/trigger/TriggerPopoverRootContext", () => ({
  useTriggerPopoverActiveAriaOptional: () => fixture.activeAria,
}));

import {
  unstable_useComposerInput,
  unstable_useTriggerPopoverAriaProps,
  type Unstable_ComposerInput,
  type Unstable_TriggerPopoverAriaProps,
} from "./useComposerInput";

const renderInput = (options?: { disabled?: boolean }) => {
  let result!: Unstable_ComposerInput;
  function Harness() {
    result = unstable_useComposerInput(options);
    return null;
  }
  render(<Harness />);
  return () => result;
};

const renderAria = () => {
  let result!: Unstable_TriggerPopoverAriaProps;
  function Harness() {
    result = unstable_useTriggerPopoverAriaProps();
    return null;
  }
  render(<Harness />);
  return () => result;
};

beforeEach(() => {
  fixture.composer = { isEditing: true, text: "hello" };
  fixture.threadDisabled = false;
  fixture.dictationInputDisabled = undefined;
  fixture.sendDisabled = false;
  fixture.activeAria = null;
  composerSetText.mockClear();
  composerSend.mockClear();
  flushTapSync.mockClear();
});

describe("unstable_useComposerInput", () => {
  it("exposes the composer text while editing", () => {
    expect(renderInput()().value).toBe("hello");
  });

  it("reports an empty value when the composer is not editing", () => {
    fixture.composer = { isEditing: false, text: "stale" };
    expect(renderInput()().value).toBe("");
  });

  it("writes text via flushTapSync when editing", () => {
    renderInput()().setText("world");
    expect(flushTapSync).toHaveBeenCalledTimes(1);
    expect(composerSetText).toHaveBeenCalledWith("world");
  });

  it("ignores setText when the composer is not editing (editing guard)", () => {
    fixture.composer = { isEditing: false, text: "" };
    renderInput()().setText("world");
    expect(composerSetText).not.toHaveBeenCalled();
  });

  it("combines the disabled option with composer disabled sources", () => {
    expect(renderInput()().isDisabled).toBe(false);
    expect(renderInput({ disabled: true })().isDisabled).toBe(true);

    fixture.threadDisabled = true;
    expect(renderInput()().isDisabled).toBe(true);

    fixture.threadDisabled = false;
    fixture.dictationInputDisabled = true;
    expect(renderInput()().isDisabled).toBe(true);
  });

  it("derives canSend from send gating and disabled state", () => {
    expect(renderInput()().canSend).toBe(true);

    fixture.sendDisabled = true;
    expect(renderInput()().canSend).toBe(false);

    fixture.sendDisabled = false;
    expect(renderInput({ disabled: true })().canSend).toBe(false);

    fixture.threadDisabled = true;
    expect(renderInput()().canSend).toBe(false);

    fixture.threadDisabled = false;
    fixture.dictationInputDisabled = true;
    expect(renderInput()().canSend).toBe(false);
  });

  it("forwards send options to the composer action", () => {
    renderInput()().send({ steer: true });
    expect(composerSend).toHaveBeenCalledWith({ steer: true });
  });
});

describe("unstable_useTriggerPopoverAriaProps", () => {
  it("is empty when no popover is active", () => {
    expect(renderAria()()).toEqual({});
  });

  it("describes the active popover combobox relationship", () => {
    fixture.activeAria = { popoverId: "pop-1", highlightedItemId: "item-2" };
    expect(renderAria()()).toEqual({
      "aria-controls": "pop-1",
      "aria-expanded": true,
      "aria-haspopup": "listbox",
      "aria-activedescendant": "item-2",
    });
  });

  it("emits an undefined aria-activedescendant when nothing is highlighted", () => {
    fixture.activeAria = { popoverId: "pop-1" };
    const props = renderAria()();
    expect(props).toHaveProperty("aria-activedescendant", undefined);
    expect(props["aria-controls"]).toBe("pop-1");
  });
});
