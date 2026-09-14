import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Thread } from "./thread.aui";

const h = vi.hoisted(() => {
  const state: any = {
    thread: {
      messages: [],
      isLoading: false,
      isDisabled: false,
      isRunning: false,
      capabilities: {
        edit: true,
        queue: false,
        reload: true,
        switchToBranch: true,
        switchBranchDuringRun: true,
      },
    },
    threads: {
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      mainThreadId: "thread-1",
      newThreadId: null,
      threadIds: [],
      archivedThreadIds: [],
      threadItems: [],
    },
    composer: {
      text: "",
      role: "user",
      attachments: [],
      runConfig: {},
      isEditing: false,
      canCancel: false,
      canSend: false,
      attachmentAccept: "",
      isEmpty: true,
      type: "thread",
      dictation: undefined,
      quote: undefined,
      queue: [],
    },
    message: undefined,
    attachment: undefined,
    suggestion: undefined,
    threadListItem: undefined,
    suggestions: { suggestions: [] },
    dataRenderers: {},
    tools: { toolUIs: [] },
  };
  state.optional = { thread: state.thread };
  const messages: any[] = [];
  const composerSend = vi.fn();
  const composerCancel = vi.fn();
  const composerSetText = vi.fn();
  const addAttachment = vi.fn();
  const removeAttachment = vi.fn();
  const setClipboardString = vi.fn();
  const switchToNewThread = vi.fn();
  const switchToThreadItem = vi.fn();
  const makeComposer = (getState: () => any) => ({
    getState,
    send: composerSend,
    cancel: composerCancel,
    setText: composerSetText,
    setRole: vi.fn(),
    setRunConfig: vi.fn(),
    addAttachment,
    clearAttachments: vi.fn(),
    attachment: ({ index }: { index: number }) => ({
      getState: () => getState().attachments[index],
      remove: removeAttachment,
    }),
    reset: vi.fn(),
    beginEdit: vi.fn(),
    startDictation: vi.fn(),
    stopDictation: vi.fn(),
    setQuote: vi.fn(),
    queueItem: vi.fn(),
  });
  const makeMessage = (overrides: Record<string, unknown> = {}) => ({
    id: `message-${messages.length + 1}`,
    role: "assistant",
    status: { type: "complete" },
    parentId: null,
    isLast: true,
    branchNumber: 1,
    branchCount: 1,
    speech: undefined,
    composer: {
      text: "",
      role: "user",
      attachments: [],
      runConfig: {},
      isEditing: false,
      canCancel: false,
      canSend: true,
      attachmentAccept: "",
      isEmpty: true,
      type: "edit",
      dictation: undefined,
      quote: undefined,
      queue: [],
    },
    parts: [],
    isCopied: false,
    isHovering: false,
    index: messages.length,
    attachments: [],
    ...overrides,
  });
  const makeMessageClient = (index: number) => {
    const getState = () => messages[index] ?? state.message;
    return {
      getState,
      composer: () => makeComposer(() => getState().composer),
      delete: vi.fn(),
      reload: vi.fn(),
      speak: vi.fn(),
      stopSpeaking: vi.fn(),
      submitFeedback: vi.fn(),
      switchToBranch: vi.fn(),
      getCopyText: () =>
        getState().parts.find((part: { type: string }) => part.type === "text")
          ?.text ?? "",
      part: ({ index: partIndex }: { index: number }) => ({
        getState: () => getState().parts[partIndex],
        addToolResult: vi.fn(),
        resumeToolCall: vi.fn(),
        respondToToolApproval: vi.fn(),
      }),
      attachment: ({ index: attachmentIndex }: { index: number }) => ({
        getState: () => getState().attachments[attachmentIndex],
        remove: removeAttachment,
      }),
      setIsCopied: vi.fn(),
      setIsHovering: vi.fn(),
    };
  };
  const rootComposer = makeComposer(() => state.composer);
  const client: any = {
    getState: () => state,
    composer: rootComposer,
    thread: {
      getState: () => state.thread,
      composer: () => rootComposer,
      message: ({ index }: { index: number }) => makeMessageClient(index),
      suggestions: vi.fn(),
    },
    message: makeMessageClient(0),
    attachment: { getState: () => state.attachment, remove: removeAttachment },
    threads: {
      getState: () => state.threads,
      switchToNewThread,
      item: vi.fn(),
    },
    threadListItem: {
      getState: () => state.threadListItem,
      switchTo: switchToThreadItem,
    },
    suggestions: {
      getState: () => state.suggestions,
      suggestion: ({ index }: { index: number }) => ({
        getState: () => state.suggestions.suggestions[index],
      }),
    },
    tools: { getState: () => state.tools },
  };

  return {
    state,
    messages,
    makeMessage,
    client,
    composerSend,
    composerCancel,
    composerSetText,
    addAttachment,
    removeAttachment,
    setClipboardString,
    switchToNewThread,
    switchToThreadItem,
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  const React = await import("react");
  const ClientContext = React.createContext<any>(h.client);
  const useAui = () => React.useContext(ClientContext);
  const useAuiState = <T,>(selector: (state: any) => T) =>
    selector(useAui().getState());

  return {
    ...actual,
    AuiConfig: (config: any) => config,
    Derived: (config: any) => config,
    AuiProvider: ({ children, config }: any) => {
      const parent = useAui();
      const scopes = Object.fromEntries(
        Object.entries(config ?? {}).map(([name, derived]: [string, any]) => [
          name,
          derived.get(parent),
        ]),
      );
      const scopedState = {
        ...parent.getState(),
        ...Object.fromEntries(
          Object.entries(scopes).map(([name, scope]: [string, any]) => [
            name,
            scope.getState(),
          ]),
        ),
      };
      const client = { ...parent, ...scopes, getState: () => scopedState };
      return React.createElement(
        ClientContext.Provider,
        { value: client },
        children,
      );
    },
    AuiIf: ({ children, condition }: any) =>
      useAuiState(condition)
        ? React.createElement(React.Fragment, null, children)
        : null,
    RenderChildrenWithAccessor: ({ children, getItemState }: any) => {
      const aui = useAui();
      return children(() => getItemState(aui));
    },
    useAui,
    useAuiState,
    useAuiEvent: () => {},
  };
});

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");

  const FlatList = React.forwardRef(function FlatList(props: any, ref) {
    React.useImperativeHandle(ref, () => ({ scrollToOffset: vi.fn() }));
    return React.createElement(
      "div",
      { "data-testid": "flatlist" },
      (props.data ?? []).map((item: unknown, index: number) =>
        React.createElement(
          "div",
          { key: props.keyExtractor?.(item, index) ?? index },
          props.renderItem({
            item,
            index,
            separators: {
              highlight: vi.fn(),
              unhighlight: vi.fn(),
              updateProps: vi.fn(),
            },
          }),
        ),
      ),
    );
  });

  return { ...actual, FlatList };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: () => undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  const icon =
    (name: string) =>
    ({ accessibilityLabel }: { accessibilityLabel?: string }) =>
      React.createElement(View, {
        testID: accessibilityLabel ?? name,
      });

  return {
    ArrowUpIcon: icon("ArrowUpIcon"),
    CheckIcon: icon("CheckIcon"),
    ChevronLeftIcon: icon("ChevronLeftIcon"),
    ChevronRightIcon: icon("ChevronRightIcon"),
    CopyIcon: icon("CopyIcon"),
    PencilIcon: icon("PencilIcon"),
    PlusIcon: icon("PlusIcon"),
    RefreshCwIcon: icon("RefreshCwIcon"),
    WrenchIcon: icon("WrenchIcon"),
    XIcon: icon("XIcon"),
  };
});

vi.mock("expo-clipboard", () => ({ setStringAsync: h.setClipboardString }));
vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: vi.fn() }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("Thread", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.messages.splice(0);
    h.state.thread.messages = [];
    h.state.thread.isLoading = false;
    h.state.thread.isDisabled = false;
    h.state.thread.isRunning = false;
    h.state.thread.capabilities.queue = false;
    h.state.threads.isLoading = false;
    h.state.composer.text = "";
    h.state.composer.isEmpty = true;
    h.state.composer.canSend = false;
    h.state.composer.canCancel = false;
    h.state.composer.attachments = [];
    h.state.suggestions.suggestions = [];
    h.composerSend.mockReset();
    h.composerCancel.mockReset();
    h.composerSetText.mockReset();
    h.addAttachment.mockReset();
    h.removeAttachment.mockReset();
    h.setClipboardString.mockReset();
    h.switchToNewThread.mockReset();
    h.switchToThreadItem.mockReset();

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const render = async () => {
    await act(async () => {
      root.render(<Thread />);
    });
  };

  const labeled = (label: string) => {
    const element = container.querySelector(`[aria-label="${label}"]`);
    expect(element).not.toBeNull();
    return element as HTMLElement;
  };

  const addMessages = (...messages: any[]) => {
    h.messages.splice(0, h.messages.length, ...messages);
    h.state.thread.messages = h.messages;
  };

  it("renders the welcome text and suggestion chips when the thread is empty", async () => {
    h.state.suggestions.suggestions = [
      { title: "Explain hooks", label: "in one paragraph", prompt: "hooks" },
    ];

    await render();

    expect(container.textContent).toContain("How can I help you today?");
    expect(container.textContent).toContain("Explain hooks");
    expect(container.textContent).toContain("in one paragraph");
  });

  it("renders a user message and an assistant text part when messages exist", async () => {
    addMessages(
      h.makeMessage({ role: "user", parts: [{ type: "text", text: "Hello" }] }),
      h.makeMessage({
        role: "assistant",
        parts: [{ type: "text", text: "Hello from the assistant" }],
      }),
    );

    await render();

    expect(container.textContent).toContain("Hello");
    expect(container.textContent).toContain("Hello from the assistant");
  });

  it("disables send while composer.canSend is false and enables it when true", async () => {
    await render();

    const send = labeled("Send message");
    expect(send.getAttribute("aria-disabled")).toBe("true");
    await act(async () => {
      click(send);
    });
    expect(h.composerSend).not.toHaveBeenCalled();

    h.state.composer.canSend = true;
    await render();

    const enabledSend = labeled("Send message");
    expect(enabledSend.getAttribute("aria-disabled")).not.toBe("true");
    await act(async () => {
      click(enabledSend);
    });
    expect(h.composerSend).toHaveBeenCalledTimes(1);
  });

  it("shows stop instead of send while the thread is running", async () => {
    h.state.thread.isRunning = true;
    h.state.composer.canCancel = true;

    await render();

    expect(container.querySelector('[aria-label="Send message"]')).toBeNull();
    expect(
      container.querySelector('[aria-label="Stop generating"]'),
    ).not.toBeNull();
  });

  it("renders the edit composer when message.composer.isEditing is true", async () => {
    addMessages(
      h.makeMessage({
        composer: { ...h.makeMessage().composer, isEditing: true },
      }),
    );

    await render();

    expect(container.textContent).toContain("Cancel");
    expect(container.textContent).toContain("Update");
  });

  it("hides the branch picker for one branch and shows its state for two", async () => {
    const message = h.makeMessage();
    addMessages(message);

    await render();

    expect(container.querySelector('[aria-label="Previous"]')).toBeNull();

    message.branchCount = 2;
    await render();

    expect(container.textContent).toContain("1 / 2");
    expect(container.querySelector('[aria-label="Previous"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Next"]')).not.toBeNull();
  });

  it("renders the error text for an errored message", async () => {
    addMessages(
      h.makeMessage({
        status: {
          type: "incomplete",
          reason: "error",
          error: "Request failed",
        },
      }),
    );

    await render();

    expect(container.textContent).toContain("Request failed");
  });

  it("copies the message text when Copy is pressed", async () => {
    addMessages(
      h.makeMessage({ parts: [{ type: "text", text: "Copy this response" }] }),
    );

    await render();

    await act(async () => {
      click(labeled("Copy"));
    });

    expect(h.setClipboardString).toHaveBeenCalledWith("Copy this response");
  });
});
