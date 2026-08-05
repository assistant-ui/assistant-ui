/**
 * @vitest-environment jsdom
 */
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveInput } from "./ComposerInput";

const setText = vi.fn<(text: string) => void>();
const setCursorPosition = vi.fn<(pos: number) => void>();
const sendSpy = vi.fn<(options?: { steer?: boolean }) => void>();
const addAttachment = vi.fn<(file: File) => Promise<void>>();
const cancelSpy = vi.fn<() => void>();

const composerState = {
  isEditing: true,
  text: "",
  type: "thread" as const,
  isEmpty: true,
  canCancel: false,
  canSend: true,
  dictation: undefined as undefined | { inputDisabled: boolean },
};

const threadState = {
  isDisabled: false,
  isRunning: false,
  capabilities: { queue: false, attachments: false },
};

const plugin = {
  handleKeyDown: () => false,
  setCursorPosition,
};

let pluginRegistry: { getPlugins: () => (typeof plugin)[] } | null = null;

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", () => {
  const aui = {
    composer: {
      setText: (text: string) => setText(text),
      getState: () => composerState,
      cancel: () => cancelSpy(),
      send: (options?: { steer?: boolean }) => sendSpy(options),
      addAttachment: (file: File) => addAttachment(file),
    },
    thread: {
      getState: () => threadState,
    },
    on: () => () => {},
  };
  type Selector<T> = (s: {
    composer: typeof composerState;
    thread: typeof threadState;
  }) => T;
  return {
    useAui: () => aui,
    useAuiState: <T,>(selector: Selector<T>) =>
      selector({ composer: composerState, thread: threadState }),
  };
});

vi.mock("@assistant-ui/tap", () => ({
  flushTapSync: (fn: () => void) => fn(),
}));

vi.mock("./ComposerInputPluginContext", () => ({
  useComposerInputPluginRegistryOptional: () => pluginRegistry,
}));

let activeAria: {
  popoverId: string;
  highlightedItemId: string | undefined;
} | null = null;

vi.mock("./trigger/TriggerPopoverRootContext", () => ({
  useTriggerPopoverActiveAriaOptional: () => activeAria,
}));

let escapeKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

vi.mock("@radix-ui/react-use-escape-keydown", () => ({
  useEscapeKeydown: (handler: (event: KeyboardEvent) => void) => {
    escapeKeydownHandler = handler;
  },
}));

vi.mock("../../utils/hooks/useOnScrollToBottom", () => ({
  useOnScrollToBottom: () => {},
}));

const setNativeValue = (textarea: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(textarea, value);
};

const fireInput = (
  textarea: HTMLTextAreaElement,
  value: string,
  isComposing: boolean,
) => {
  setNativeValue(textarea, value);
  textarea.dispatchEvent(
    new InputEvent("input", { bubbles: true, isComposing }),
  );
};

const fireCompositionStart = (textarea: HTMLTextAreaElement) => {
  textarea.dispatchEvent(
    new CompositionEvent("compositionstart", { bubbles: true }),
  );
};

const fireCompositionEnd = (textarea: HTMLTextAreaElement, value: string) => {
  setNativeValue(textarea, value);
  textarea.dispatchEvent(
    new CompositionEvent("compositionend", { bubbles: true }),
  );
};

const fireKeyDown = (
  textarea: HTMLTextAreaElement,
  opts: {
    key?: string;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    isComposing?: boolean;
  } = {},
): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: opts.key ?? "Enter",
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    isComposing: opts.isComposing ?? false,
  });
  textarea.dispatchEvent(event);
  return event;
};

const firePaste = (textarea: HTMLTextAreaElement, files: File[]) => {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { files },
    configurable: true,
  });
  textarea.dispatchEvent(event);
  return event;
};

const setMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

describe("ComposerPrimitiveInput", () => {
  let container: HTMLDivElement;
  let root: Root;
  let requestSubmitSpy: ReturnType<
    typeof vi.fn<(submitter?: HTMLElement | null) => void>
  >;
  let originalRequestSubmit: HTMLFormElement["requestSubmit"] | undefined;

  beforeEach(() => {
    setText.mockReset();
    setCursorPosition.mockReset();
    sendSpy.mockReset();
    addAttachment.mockReset();
    cancelSpy.mockReset();
    composerState.isEditing = true;
    composerState.text = "";
    composerState.isEmpty = true;
    composerState.canSend = true;
    composerState.dictation = undefined;
    composerState.canCancel = false;
    threadState.isDisabled = false;
    threadState.isRunning = false;
    threadState.capabilities = { queue: false, attachments: false };
    pluginRegistry = null;
    activeAria = null;
    escapeKeydownHandler = null;
    setMatchMedia(false);

    requestSubmitSpy = vi.fn<(submitter?: HTMLElement | null) => void>();
    originalRequestSubmit = HTMLFormElement.prototype.requestSubmit;
    HTMLFormElement.prototype.requestSubmit = requestSubmitSpy;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    if (originalRequestSubmit) {
      HTMLFormElement.prototype.requestSubmit = originalRequestSubmit;
    } else {
      delete (HTMLFormElement.prototype as Partial<HTMLFormElement>)
        .requestSubmit;
    }
    vi.restoreAllMocks();
  });

  const mount = async (
    props: Partial<ComponentProps<typeof ComposerPrimitiveInput>> = {},
  ) => {
    await act(async () => {
      root.render(
        <form>
          <ComposerPrimitiveInput data-testid="input" {...props} />
        </form>,
      );
    });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    return textarea;
  };

  it("syncs setText during active composition so React 19 cannot reset the textarea", async () => {
    const textarea = await mount();

    await act(async () => {
      fireCompositionStart(textarea);
      fireInput(textarea, "ㄱ", true);
    });
    expect(setText).toHaveBeenCalledWith("ㄱ");

    await act(async () => {
      fireInput(textarea, "가", true);
    });
    expect(setText).toHaveBeenLastCalledWith("가");
  });

  it("commits the final value on compositionend", async () => {
    const textarea = await mount();

    await act(async () => {
      fireCompositionStart(textarea);
      fireInput(textarea, "가", true);
    });
    expect(setText).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireCompositionEnd(textarea, "가");
    });
    expect(setText).toHaveBeenCalledTimes(2);
    expect(setText).toHaveBeenLastCalledWith("가");
  });

  it("recovers when compositionend is dropped before the next input", async () => {
    const textarea = await mount();

    await act(async () => {
      fireCompositionStart(textarea);
      fireInput(textarea, "hello", false);
    });
    expect(setText).toHaveBeenCalledWith("hello");

    await act(async () => {
      fireInput(textarea, "hello!", false);
    });
    expect(setText).toHaveBeenLastCalledWith("hello!");
  });

  it("skips plugin cursor tracking during composition but resumes after", async () => {
    pluginRegistry = { getPlugins: () => [plugin] };
    const textarea = await mount();

    await act(async () => {
      fireCompositionStart(textarea);
      fireInput(textarea, "ㄱ", true);
    });
    expect(setText).toHaveBeenCalledWith("ㄱ");
    expect(setCursorPosition).not.toHaveBeenCalled();

    await act(async () => {
      fireCompositionEnd(textarea, "가");
    });
    expect(setCursorPosition).toHaveBeenCalled();
  });

  it("tracks plugin cursor for non-composition input", async () => {
    pluginRegistry = { getPlugins: () => [plugin] };
    const textarea = await mount();

    await act(async () => {
      fireInput(textarea, "abc", false);
    });
    expect(setText).toHaveBeenCalledWith("abc");
    expect(setCursorPosition).toHaveBeenCalled();
  });

  it("ignores input and compositionend when the composer is not editing", async () => {
    composerState.isEditing = false;
    const textarea = await mount();

    await act(async () => {
      fireInput(textarea, "abc", false);
      fireCompositionStart(textarea);
      fireCompositionEnd(textarea, "가");
    });
    expect(setText).not.toHaveBeenCalled();
  });

  it("does not apply ARIA combobox attributes when no trigger popover is open", async () => {
    activeAria = null;
    const textarea = await mount();

    expect(textarea.getAttribute("aria-controls")).toBeNull();
    expect(textarea.getAttribute("aria-expanded")).toBeNull();
    expect(textarea.getAttribute("aria-haspopup")).toBeNull();
    expect(textarea.getAttribute("aria-activedescendant")).toBeNull();
  });

  it("applies ARIA combobox attributes when a trigger popover is open", async () => {
    activeAria = {
      popoverId: "popover-1",
      highlightedItemId: "popover-1-option-foo",
    };
    const textarea = await mount();

    expect(textarea.getAttribute("aria-controls")).toBe("popover-1");
    expect(textarea.getAttribute("aria-expanded")).toBe("true");
    expect(textarea.getAttribute("aria-haspopup")).toBe("listbox");
    expect(textarea.getAttribute("aria-activedescendant")).toBe(
      "popover-1-option-foo",
    );
  });

  it("omits aria-activedescendant when no item is highlighted", async () => {
    activeAria = {
      popoverId: "popover-1",
      highlightedItemId: undefined,
    };
    const textarea = await mount();

    expect(textarea.getAttribute("aria-controls")).toBe("popover-1");
    expect(textarea.getAttribute("aria-expanded")).toBe("true");
    expect(textarea.getAttribute("aria-haspopup")).toBe("listbox");
    expect(textarea.getAttribute("aria-activedescendant")).toBeNull();
  });

  describe("submit behavior", () => {
    it("submits on plain Enter under the default submitMode", async () => {
      const textarea = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter" });
      });

      expect(requestSubmitSpy).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("inserts a newline on Shift+Enter without submitting", async () => {
      const textarea = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter", shiftKey: true });
      });

      expect(requestSubmitSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("ignores Enter while an IME composition is active", async () => {
      const textarea = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter", isComposing: true });
      });

      expect(requestSubmitSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("submitMode='ctrlEnter' submits on Cmd/Ctrl+Enter but not on plain Enter", async () => {
      const textarea = await mount({ submitMode: "ctrlEnter" });

      let plain!: KeyboardEvent;
      await act(async () => {
        plain = fireKeyDown(textarea, { key: "Enter" });
      });
      expect(requestSubmitSpy).not.toHaveBeenCalled();
      expect(plain.defaultPrevented).toBe(false);

      let withMeta!: KeyboardEvent;
      await act(async () => {
        withMeta = fireKeyDown(textarea, { key: "Enter", metaKey: true });
      });
      expect(requestSubmitSpy).toHaveBeenCalledTimes(1);
      expect(withMeta.defaultPrevented).toBe(true);

      let withCtrl!: KeyboardEvent;
      await act(async () => {
        withCtrl = fireKeyDown(textarea, { key: "Enter", ctrlKey: true });
      });
      expect(requestSubmitSpy).toHaveBeenCalledTimes(2);
      expect(withCtrl.defaultPrevented).toBe(true);
    });

    it("submitMode='none' leaves Enter to insert a native newline", async () => {
      const textarea = await mount({ submitMode: "none" });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter" });
      });

      expect(requestSubmitSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("unstable_insertNewlineOnTouchEnter downgrades Enter on touch-primary devices", async () => {
      setMatchMedia(true);
      const textarea = await mount({
        unstable_insertNewlineOnTouchEnter: true,
      });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter" });
      });

      expect(requestSubmitSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("unstable_insertNewlineOnTouchEnter is a no-op on desktop", async () => {
      setMatchMedia(false);
      const textarea = await mount({
        unstable_insertNewlineOnTouchEnter: true,
      });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter" });
      });

      expect(requestSubmitSpy).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("unstable_insertNewlineOnTouchEnter does not override submitMode='ctrlEnter'", async () => {
      setMatchMedia(true);
      const textarea = await mount({
        submitMode: "ctrlEnter",
        unstable_insertNewlineOnTouchEnter: true,
      });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter", metaKey: true });
      });

      expect(requestSubmitSpy).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("unstable_insertNewlineOnTouchEnter does not override submitMode='none'", async () => {
      setMatchMedia(true);
      const textarea = await mount({
        submitMode: "none",
        unstable_insertNewlineOnTouchEnter: true,
      });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, { key: "Enter" });
      });

      expect(requestSubmitSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("preserves steer (Cmd+Shift+Enter) on touch when unstable_insertNewlineOnTouchEnter is set", async () => {
      setMatchMedia(true);
      threadState.capabilities = { queue: true, attachments: false };
      const textarea = await mount({
        unstable_insertNewlineOnTouchEnter: true,
      });

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireKeyDown(textarea, {
          key: "Enter",
          metaKey: true,
          shiftKey: true,
        });
      });

      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith({ steer: true });
      expect(requestSubmitSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("escape behavior", () => {
    const fireEscape = (
      textarea: HTMLTextAreaElement,
      opts: { isComposing?: boolean } = {},
    ): KeyboardEvent => {
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Escape",
        isComposing: opts.isComposing ?? false,
      });
      textarea.dispatchEvent(event);
      escapeKeydownHandler?.(event);
      return event;
    };

    it("cancels the composer on Escape when cancellable", async () => {
      composerState.canCancel = true;
      const textarea = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireEscape(textarea);
      });

      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it("ignores Escape while an IME composition is active", async () => {
      composerState.canCancel = true;
      const textarea = await mount();

      let event!: KeyboardEvent;
      await act(async () => {
        event = fireEscape(textarea, { isComposing: true });
      });

      expect(cancelSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("paste attachments", () => {
    it("attempts every pasted file and prevents default when attachments are supported", async () => {
      threadState.capabilities = { queue: false, attachments: true };

      const textarea = await mount();

      let event!: Event;
      await act(async () => {
        event = firePaste(textarea, [
          new File(["a"], "first.txt", { type: "text/plain" }),
          new File(["b"], "second.txt", { type: "text/plain" }),
          new File(["c"], "third.txt", { type: "text/plain" }),
        ]);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(addAttachment).toHaveBeenCalledTimes(3);
      expect(addAttachment.mock.calls.map(([file]) => file.name)).toEqual([
        "first.txt",
        "second.txt",
        "third.txt",
      ]);
      expect(event.defaultPrevented).toBe(true);
    });

    it("continues processing other files when one attachment fails without console.error", async () => {
      threadState.capabilities = { queue: false, attachments: true };
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      addAttachment
        .mockRejectedValueOnce(new Error("upload failed"))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const textarea = await mount();

      await act(async () => {
        firePaste(textarea, [
          new File(["a"], "first.txt", { type: "text/plain" }),
          new File(["b"], "second.txt", { type: "text/plain" }),
          new File(["c"], "third.txt", { type: "text/plain" }),
        ]);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(addAttachment).toHaveBeenCalledTimes(3);
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("does not add attachments on paste when attachments are unsupported", async () => {
      threadState.capabilities = { queue: false, attachments: false };

      const textarea = await mount();

      let event!: Event;
      await act(async () => {
        event = firePaste(textarea, [
          new File(["a"], "first.txt", { type: "text/plain" }),
        ]);
        await Promise.resolve();
      });

      expect(addAttachment).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it("skips attachment handling when addAttachmentOnPaste is false", async () => {
      threadState.capabilities = { queue: false, attachments: true };

      const textarea = await mount({ addAttachmentOnPaste: false });

      await act(async () => {
        firePaste(textarea, [
          new File(["a"], "first.txt", { type: "text/plain" }),
        ]);
        await Promise.resolve();
      });

      expect(addAttachment).not.toHaveBeenCalled();
    });
  });
});
