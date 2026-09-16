import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Pressable, Text, View } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Thread, useThreadViewport } from "./thread.aui";

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
  const announceForAccessibility = vi.fn();
  const layout = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    windowTop: 0,
  };
  const switchToNewThread = vi.fn();
  const switchToThreadItem = vi.fn();
  const list = {
    props: null as any,
    mounts: 0,
    scrollToIndex: vi.fn(),
    scrollToOffset: vi.fn(),
  };
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
    announceForAccessibility,
    layout,
    list,
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

  const View = ({
    children,
    className,
    testID,
    accessible: _accessible,
    accessibilityLabel,
    accessibilityLiveRegion,
    accessibilityRole,
    style: _style,
    onLayout,
    ref,
    ...props
  }: any) => {
    React.useEffect(() => {
      onLayout?.({ nativeEvent: { layout: {} } });
    }, [onLayout]);

    return React.createElement(
      "div",
      {
        ...props,
        ref: (node: any) => {
          if (node) {
            node.measureInWindow = (callback: any) =>
              callback(0, h.layout.windowTop, 0, 0);
          }
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        },
        className,
        "data-testid": testID,
        "aria-label": accessibilityLabel,
        "aria-live": accessibilityLiveRegion,
        role: accessibilityRole,
      },
      children,
    );
  };

  const KeyboardAvoidingView = ({ children, keyboardVerticalOffset }: any) =>
    React.createElement(
      "div",
      { "data-testid": "kav", "data-offset": String(keyboardVerticalOffset) },
      children,
    );

  const FlatList = React.forwardRef(function FlatList(props: any, ref) {
    h.list.props = props;
    React.useEffect(() => {
      h.list.mounts += 1;
    }, []);
    React.useImperativeHandle(ref, () => ({
      scrollToIndex: h.list.scrollToIndex,
      scrollToOffset: h.list.scrollToOffset,
    }));
    const Header = props.ListHeaderComponent;
    return React.createElement(
      "div",
      { "data-testid": "flatlist" },
      Header
        ? React.isValidElement(Header)
          ? Header
          : React.createElement(Header)
        : null,
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

  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      announceForAccessibility: h.announceForAccessibility,
    },
    FlatList,
    KeyboardAvoidingView,
    View,
  };
});

vi.mock("react-native-marked", async () => {
  const React = await import("react");
  const { Text } = await import("react-native");
  let keys = 0;
  class Renderer {
    getKey() {
      keys += 1;
      return `marked-${keys}`;
    }
    code(_text: string, _language?: string): unknown {
      return null;
    }
  }
  const MarkedLexer = (text: string) =>
    text
      .split(/\n{2,}/)
      .filter((raw) => raw.trim().length > 0)
      .map((raw) => ({
        type: raw.startsWith("```") ? "code" : "paragraph",
        raw,
      }));
  const useMarkdown = (raw: string, options: { renderer: Renderer }) => {
    const fences = [...raw.matchAll(/```([^\n]*)\n([\s\S]*?)\n\s*```/g)];
    if (fences.length > 0)
      return [
        ...fences.map((fence) =>
          options.renderer.code(fence[2] ?? "", fence[1]?.trim() || undefined),
        ),
        ...(raw.replace(/```[^\n]*\n[\s\S]*?\n\s*```/g, "").trim()
          ? [
              React.createElement(
                Text,
                { key: options.renderer.getKey() },
                raw.replace(/```[^\n]*\n[\s\S]*?\n\s*```/g, "").trim(),
              ),
            ]
          : []),
      ];
    return [React.createElement(Text, { key: options.renderer.getKey() }, raw)];
  };
  class MarkedTokenizer {}
  return { MarkedLexer, MarkedTokenizer, Renderer, useMarkdown };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => undefined) : undefined,
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
vi.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: vi.fn() },
  SaveFormat: { JPEG: "jpeg" },
}));
vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: vi.fn() }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => h.layout.insets,
}));

vi.mock("./image", async () => {
  const React = await import("react");
  return {
    Image: ({ image }: { image: string }) =>
      React.createElement("div", {
        "data-testid": "image-part",
        "data-image": image,
      }),
  };
});

vi.mock("./file", async () => {
  const React = await import("react");
  return {
    File: ({ filename }: { filename?: string }) =>
      React.createElement("div", {
        "data-testid": "file-part",
        "data-filename": filename,
      }),
  };
});

vi.mock("./reasoning.aui", async () => {
  const React = await import("react");
  const Root = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "reasoning-root" }, children);
  const Trigger = ({ active }: { active?: boolean }) =>
    React.createElement("button", {
      "data-testid": "reasoning-trigger",
      "data-active": String(active),
    });
  const Content = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-testid": "reasoning-content" },
      children,
    );
  const Text = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "reasoning-text" }, children);
  const Reasoning = ({ text }: { text: string }) =>
    React.createElement("div", { "data-testid": "reasoning-part" }, text);

  return {
    Reasoning,
    ReasoningContent: Content,
    ReasoningRoot: Root,
    ReasoningText: Text,
    ReasoningTrigger: Trigger,
  };
});

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
    h.layout.insets = { top: 0, bottom: 0, left: 0, right: 0 };
    h.layout.windowTop = 0;
    h.composerSend.mockReset();
    h.composerCancel.mockReset();
    h.composerSetText.mockReset();
    h.addAttachment.mockReset();
    h.removeAttachment.mockReset();
    h.setClipboardString.mockReset();
    h.announceForAccessibility.mockReset();
    h.switchToNewThread.mockReset();
    h.switchToThreadItem.mockReset();
    h.list.props = null;
    h.list.mounts = 0;
    h.list.scrollToIndex.mockReset();
    h.list.scrollToOffset.mockReset();

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

  const render = async (props: ComponentProps<typeof Thread> = {}) => {
    await act(async () => {
      root.render(<Thread {...props} />);
    });
  };

  const labeled = (label: string) => {
    const element = container.querySelector(`[aria-label="${label}"]`);
    expect(element).not.toBeNull();
    return element as HTMLElement;
  };

  const addMessages = (...messages: any[]) => {
    h.messages.splice(0, h.messages.length, ...messages);
    h.messages.forEach((message, index) => {
      message.id = `message-${index + 1}`;
      message.isLast = index === h.messages.length - 1;
    });
    h.state.thread.messages = h.messages;
  };

  it("offsets the keyboard by the viewport's window position minus the bottom inset", async () => {
    h.layout.windowTop = 100;
    h.layout.insets = { top: 0, bottom: 34, left: 0, right: 0 };

    await render();

    expect(
      container
        .querySelector('[data-testid="kav"]')
        ?.getAttribute("data-offset"),
    ).toBe("66");
  });

  it("lets the footer's bottom inset cancel out when nothing sits above the thread", async () => {
    h.layout.windowTop = 0;
    h.layout.insets = { top: 0, bottom: 34, left: 0, right: 0 };

    await render();

    expect(
      container
        .querySelector('[data-testid="kav"]')
        ?.getAttribute("data-offset"),
    ).toBe("-34");
  });

  it("renders the welcome text and suggestion chips when the thread is empty", async () => {
    h.state.suggestions.suggestions = [
      { title: "Explain hooks", label: "in one paragraph", prompt: "hooks" },
    ];

    await render();

    expect(container.textContent).toContain("How can I help you today?");
    expect(container.textContent).toContain("Explain hooks");
    expect(container.textContent).toContain("in one paragraph");
  });

  it("renders a custom welcome in place of the default greeting", async () => {
    const Welcome = () => <Text>Ask me about the codebase</Text>;

    await render({ components: { Welcome } });

    expect(container.textContent).toContain("Ask me about the codebase");
    expect(container.textContent).not.toContain("How can I help you today?");
  });

  it("swaps the composer input for a custom editor while keeping send", async () => {
    const ComposerInput = () => (
      <View accessibilityLabel="Rich editor" testID="rich-editor" />
    );
    h.state.composer.canSend = true;

    await render({ components: { ComposerInput } });

    expect(
      container.querySelector('[data-testid="rich-editor"]'),
    ).not.toBeNull();
    expect(container.querySelector('[aria-label="Message input"]')).toBeNull();
    labeled("Send message");
  });

  it("mounts the same custom editor inside the edit composer", async () => {
    const ComposerInput = () => <View testID="rich-editor" />;
    addMessages(
      h.makeMessage({
        composer: { ...h.makeMessage().composer, isEditing: true },
      }),
    );

    await render({ components: { ComposerInput } });

    expect(
      container.querySelectorAll('[data-testid="rich-editor"]'),
    ).toHaveLength(2);
    expect(container.textContent).toContain("Update");
  });

  it("routes tool calls to a custom fallback", async () => {
    const ToolFallback = ({ toolName }: { toolName: string }) => (
      <Text>custom tool: {toolName}</Text>
    );
    addMessages(
      h.makeMessage({
        parts: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            args: {},
            argsText: "{}",
            status: { type: "complete" },
          },
        ],
      }),
    );

    await render({ components: { ToolFallback } });

    expect(container.textContent).toContain("custom tool: search");
  });

  it("keeps the docked layout and announces the skeleton while a thread loads its history", async () => {
    h.state.thread.isLoading = true;

    await render();

    const viewport = container.querySelector(".aui-thread-viewport");
    expect(viewport?.className).not.toContain("justify-center");
    expect(
      container.querySelector(
        '[role="progressbar"][aria-label="Loading conversation"]',
      ),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("How can I help you today?");
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

  it("routes media parts and adjacent reasoning through the assistant renderers", async () => {
    addMessages(
      h.makeMessage({
        status: { type: "running" },
        parts: [
          {
            type: "image",
            image: "https://example.com/image.png",
            status: { type: "complete" },
          },
          {
            type: "file",
            filename: "report.pdf",
            data: "https://example.com/report.pdf",
            sourceType: "url",
          },
          {
            type: "reasoning",
            text: "First thought",
            status: { type: "running" },
          },
          {
            type: "reasoning",
            text: "Second thought",
            status: { type: "running" },
          },
        ],
      }),
    );

    await render();

    expect(
      container
        .querySelector('[data-testid="image-part"]')
        ?.getAttribute("data-image"),
    ).toBe("https://example.com/image.png");
    expect(
      container
        .querySelector('[data-testid="file-part"]')
        ?.getAttribute("data-filename"),
    ).toBe("report.pdf");
    const triggers = container.querySelectorAll(
      '[data-testid="reasoning-trigger"]',
    );
    expect(triggers).toHaveLength(1);
    expect(triggers[0]?.getAttribute("data-active")).toBe("true");
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

  it("shows the indicator and announces once per run while the assistant is working", async () => {
    addMessages(h.makeMessage({ status: { type: "running" } }));

    await render();
    expect(h.announceForAccessibility).not.toHaveBeenCalled();

    h.state.thread.isRunning = true;
    await render();
    await render();

    const indicator = container.querySelector(
      '[aria-label="Assistant is working"]',
    );
    expect(indicator?.getAttribute("aria-live")).toBe("polite");
    expect(h.announceForAccessibility).toHaveBeenCalledTimes(1);
    expect(h.announceForAccessibility).toHaveBeenCalledWith(
      "Assistant is working",
    );

    h.state.thread.isRunning = false;
    await render();
    h.state.thread.isRunning = true;
    await render();

    expect(h.announceForAccessibility).toHaveBeenCalledTimes(2);
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
  describe("rail slot", () => {
    const Rail = () => {
      const viewport = useThreadViewport();
      return (
        <View testID="rail">
          <Text>{JSON.stringify(viewport.visibleMessageIds)}</Text>
          <Text>{`descent ${viewport.descent} height ${viewport.height} top ${viewport.top}`}</Text>
          <Pressable
            accessibilityLabel="Jump"
            onPress={() => viewport.scrollToMessage("message-2")}
          />
        </View>
      );
    };

    const conversation = () =>
      addMessages(
        h.makeMessage({ role: "user", parts: [{ type: "text", text: "One" }] }),
        h.makeMessage({
          role: "assistant",
          parts: [{ type: "text", text: "Two" }],
        }),
        h.makeMessage({
          role: "user",
          parts: [{ type: "text", text: "Three" }],
        }),
      );

    it("overlays the rail on the message list and feeds it what the list shows", async () => {
      conversation();
      await render({ components: { Rail } });

      const rail = container.querySelector('[data-testid="rail"]');
      expect(rail).not.toBeNull();
      expect(container.querySelector(".aui-thread-rail")).not.toBeNull();
      expect(rail!.textContent).toContain("descent 0 height 0 top 0");

      await act(async () => {
        h.list.props.onViewableItemsChanged({
          viewableItems: [{ item: h.messages[1] }, { item: h.messages[2] }],
        });
        h.list.props.onLayout({
          nativeEvent: { layout: { height: 500, y: 31 } },
        });
        h.list.props.onScroll({
          nativeEvent: {
            contentOffset: { y: 100 },
            contentSize: { height: 800 },
            layoutMeasurement: { height: 500 },
          },
        });
      });

      expect(rail!.textContent).toContain('["message-2","message-3"]');
      expect(rail!.textContent).toContain("descent 0.6 height 500 top 31");
    });

    it("scrolls the list to a message by id and retries once through an instant offset estimate", async () => {
      vi.useFakeTimers();
      try {
        conversation();
        await render({ components: { Rail } });

        await act(async () => {
          labeled("Jump").dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
        });
        expect(h.list.scrollToIndex).toHaveBeenCalledWith({
          index: 1,
          animated: true,
          viewPosition: 0,
        });

        await act(async () => {
          h.list.props.onScrollToIndexFailed({
            index: 1,
            averageItemLength: 120,
          });
        });
        expect(h.list.scrollToOffset).toHaveBeenCalledWith({
          offset: 120,
          animated: false,
        });
        expect(h.list.scrollToIndex).toHaveBeenCalledTimes(1);

        await act(async () => {
          vi.advanceTimersByTime(100);
        });
        expect(h.list.scrollToIndex).toHaveBeenCalledTimes(2);

        await act(async () => {
          h.list.props.onScrollToIndexFailed({
            index: 1,
            averageItemLength: 120,
          });
          vi.advanceTimersByTime(100);
        });
        expect(h.list.scrollToIndex).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it("drops a pending retry when the message is gone or another jump starts", async () => {
      vi.useFakeTimers();
      try {
        conversation();
        await render({ components: { Rail } });

        await act(async () => {
          labeled("Jump").dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
          h.list.props.onScrollToIndexFailed({
            index: 1,
            averageItemLength: 120,
          });
        });
        addMessages(
          h.makeMessage({
            role: "user",
            parts: [{ type: "text", text: "Another thread" }],
          }),
        );
        await act(async () => {
          vi.advanceTimersByTime(100);
        });
        expect(h.list.scrollToIndex).toHaveBeenCalledTimes(1);

        conversation();
        await act(async () => {
          labeled("Jump").dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
          h.list.props.onScrollToIndexFailed({
            index: 1,
            averageItemLength: 120,
          });
          labeled("Jump").dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
          vi.advanceTimersByTime(100);
        });
        expect(h.list.scrollToIndex).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });

    it("publishes a full descent for a thread that fits without any scroll event", async () => {
      conversation();
      await render({ components: { Rail } });

      await act(async () => {
        h.list.props.onLayout({
          nativeEvent: { layout: { height: 500, y: 0 } },
        });
        h.list.props.onContentSizeChange(0, 300);
      });

      expect(
        container.querySelector('[data-testid="rail"]')!.textContent,
      ).toContain("descent 1 height 500 top 0");
    });

    it("tracks the list only while a rail is mounted, and remounts it when the slot flips", async () => {
      conversation();
      await render();

      expect(h.list.props.onViewableItemsChanged).toBeUndefined();
      expect(h.list.props.viewabilityConfig).toBeUndefined();
      expect(h.list.props.onScrollToIndexFailed).toBeUndefined();
      expect(h.list.props.contentContainerClassName).not.toContain("pl-10");
      expect(h.list.mounts).toBe(1);

      await render({ components: { Rail } });

      expect(h.list.props.onViewableItemsChanged).toBeTypeOf("function");
      expect(h.list.props.contentContainerClassName).toContain("pl-10");
      expect(h.list.mounts).toBe(2);
    });

    it("renders no overlay without a rail", async () => {
      conversation();
      await render();

      expect(container.querySelector(".aui-thread-rail")).toBeNull();
    });
  });

  describe("windowed history", () => {
    const edge = () => container.querySelector(".aui-thread-history-edge");
    const oneMessage = () =>
      addMessages(
        h.makeMessage({ role: "user", parts: [{ type: "text", text: "One" }] }),
      );

    it("asks for older messages at the list's start while they exist, and stops once they are exhausted", async () => {
      const loadMore = vi.fn();
      oneMessage();
      await render({
        history: { hasMore: true, isLoadingMore: false, loadMore },
      });

      expect(h.list.props.onStartReachedThreshold).toBe(1);
      h.list.props.onStartReached({ distanceFromStart: 0 });
      expect(loadMore).toHaveBeenCalledTimes(1);
      expect(loadMore).toHaveBeenCalledWith();
      expect(edge()).toBeNull();

      await render({
        history: { hasMore: false, isLoadingMore: false, loadMore },
      });

      expect(h.list.props.onStartReached).toBeUndefined();
      expect(edge()).toBeNull();
    });

    it("shows the loading edge above the list, announces it and pauses the loader while a page loads", async () => {
      oneMessage();
      await render({
        history: { hasMore: true, isLoadingMore: true, loadMore: vi.fn() },
      });

      expect(edge()).not.toBeNull();
      expect(edge()!.textContent).toContain("Loading earlier messages");
      expect(edge()!.getAttribute("aria-live")).toBe("polite");
      expect(
        edge()!.compareDocumentPosition(
          container.querySelector('[data-testid="flatlist"]')!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(h.list.props.ListHeaderComponent).toBeUndefined();
      expect(h.list.props.onStartReached).toBeUndefined();
      expect(h.announceForAccessibility).toHaveBeenCalledWith(
        "Loading earlier messages",
      );
    });

    it("restores the loader and clears the edge once the page has landed", async () => {
      const loadMore = vi.fn();
      oneMessage();
      await render({
        history: { hasMore: true, isLoadingMore: true, loadMore },
      });

      expect(edge()).not.toBeNull();
      expect(h.list.props.onStartReached).toBeUndefined();

      addMessages(
        h.makeMessage({
          role: "user",
          parts: [{ type: "text", text: "Older" }],
        }),
        h.makeMessage({ role: "user", parts: [{ type: "text", text: "One" }] }),
      );
      await render({
        history: { hasMore: true, isLoadingMore: false, loadMore },
      });

      expect(edge()).toBeNull();
      expect(container.textContent).toContain("Older");
      h.list.props.onStartReached({ distanceFromStart: 0 });
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it("leaves the list alone without a history", async () => {
      oneMessage();
      await render();

      expect(h.list.props.onStartReached).toBeUndefined();
      expect(h.list.props.onStartReachedThreshold).toBeUndefined();
      expect(edge()).toBeNull();
    });
  });
});
