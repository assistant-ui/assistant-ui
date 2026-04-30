/**
 * @vitest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveInput } from "./ComposerInput";

const setText = vi.fn<(text: string) => void>();

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

const setCursorPosition = vi.fn<(pos: number) => void>();
const plugin = {
  handleKeyDown: () => false,
  setCursorPosition,
};

let pluginRegistry: { getPlugins: () => (typeof plugin)[] } | null = null;

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

const fireInput = (
  textarea: HTMLTextAreaElement,
  value: string,
  isComposing: boolean,
) => {
  // fireEvent.change uses the prototype value setter so React 19 detects
  // the change. We override isComposing on the synthetic native event so
  // the IME branch in onChange is exercised correctly.
  fireEvent.input(textarea, {
    target: { value },
    isComposing,
  });
};

describe("ComposerPrimitiveInput", () => {
  let textarea: HTMLTextAreaElement;

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderInput = () => {
    const { container } = render(
      <ComposerPrimitiveInput data-testid="input" />,
    );
    textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
  };

  describe("IME composition", () => {
    it("calls setText during active composition so React 19 cannot reset the textarea value", () => {
      renderInput();

      // Korean IME starts composing
      fireEvent.compositionStart(textarea);

      // While composing, the input event reports isComposing=true.
      // Previously this skipped setText and the controlled value stayed
      // stale, letting React 19's reconciliation wipe the textarea.
      fireInput(textarea, "ㄱ", true);
      expect(setText).toHaveBeenCalledWith("ㄱ");

      fireInput(textarea, "가", true);
      expect(setText).toHaveBeenLastCalledWith("가");
    });

    it("commits the final value on compositionend", () => {
      renderInput();

      fireEvent.compositionStart(textarea);
      fireInput(textarea, "가", true);
      fireEvent.compositionEnd(textarea, { target: { value: "가" } });

      expect(setText).toHaveBeenLastCalledWith("가");
    });

    it("recovers from a stuck composition state when compositionend is dropped", () => {
      renderInput();

      // Some browsers and dead-key layouts drop compositionend, leaving
      // compositionRef stuck at true and freezing the input. Once the next
      // input event arrives without isComposing, the ref must self-heal.
      fireEvent.compositionStart(textarea);

      // No compositionend fires here.

      // A regular keystroke now arrives with isComposing=false.
      fireInput(textarea, "hello", false);
      expect(setText).toHaveBeenCalledWith("hello");

      // A subsequent regular input continues to work, proving the ref reset.
      fireInput(textarea, "hello!", false);
      expect(setText).toHaveBeenLastCalledWith("hello!");
    });

    it("skips plugin cursor tracking during composition but resumes after", () => {
      pluginRegistry = { getPlugins: () => [plugin] };
      renderInput();

      fireEvent.compositionStart(textarea);
      fireInput(textarea, "ㄱ", true);

      expect(setText).toHaveBeenCalledWith("ㄱ");
      // Cursor should NOT be tracked while composing — the selection
      // position is unstable until the composition resolves.
      expect(setCursorPosition).not.toHaveBeenCalled();

      fireEvent.compositionEnd(textarea, { target: { value: "가" } });
      // After compositionend the plugin gets the final cursor position.
      expect(setCursorPosition).toHaveBeenCalled();
    });
  });

  describe("non-composition input", () => {
    it("calls setText and tracks plugin cursor for normal keystrokes", () => {
      pluginRegistry = { getPlugins: () => [plugin] };
      renderInput();

      fireInput(textarea, "abc", false);

      expect(setText).toHaveBeenCalledWith("abc");
      expect(setCursorPosition).toHaveBeenCalled();
    });
  });
});
