/**
 * @vitest-environment jsdom
 */
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveInput } from "./ComposerInput";

const setText = vi.fn<(text: string) => void>();
const setCursorPosition = vi.fn<(pos: number) => void>();

const composerState = {
  isEditing: true,
  text: "",
  type: "thread" as const,
  isEmpty: true,
  canCancel: false,
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

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", () => {
  const aui = {
    composer: () => ({
      setText,
      getState: () => composerState,
      cancel: () => {},
      send: () => {},
      addAttachment: async () => {},
    }),
    thread: () => ({
      getState: () => threadState,
    }),
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
  flushResourcesSync: (fn: () => void) => fn(),
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

vi.mock("@radix-ui/react-use-escape-keydown", () => ({
  useEscapeKeydown: () => {},
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
    composerState.isEditing = true;
    composerState.text = "";
    composerState.isEmpty = true;
    composerState.dictation = undefined;
    threadState.isDisabled = false;
    threadState.isRunning = false;
    threadState.capabilities = { queue: false, attachments: false };
    pluginRegistry = null;
    activeAria = null;
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
  });
});
