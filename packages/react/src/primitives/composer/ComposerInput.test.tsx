/**
 * @vitest-environment jsdom
 */
import { act } from "react";
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

describe("ComposerPrimitiveInput", () => {
  let container: HTMLDivElement;
  let root: Root;

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

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  const mount = async () => {
    await act(async () => {
      root.render(<ComposerPrimitiveInput data-testid="input" />);
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
});
