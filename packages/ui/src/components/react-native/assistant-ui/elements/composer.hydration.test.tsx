import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { Thread } from "./thread.aui";

const h = vi.hoisted(() => {
  const state = {
    thread: {
      messages: [],
      isLoading: true,
      isDisabled: false,
      isRunning: false,
    },
    threads: { isLoading: false },
    composer: { isEmpty: true },
  };

  return {
    hasStyleSheet: true,
    state,
    aui: { thread: { getState: () => state.thread } },
  };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
}));

// Uniwind's Metro transform maps `placeholderTextColorClassName` on the core `TextInput`; the wrapper stands in for that mapping.
vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const TextInput = ({
    placeholderTextColorClassName,
    ...props
  }: Record<string, unknown>) =>
    React.createElement(actual.TextInput, {
      ...props,
      ...(placeholderTextColorClassName !== undefined && h.hasStyleSheet
        ? { placeholderTextColor: "#71717b99" }
        : {}),
    });

  return { ...actual, TextInput };
});

vi.mock("@assistant-ui/react-native", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/react-native")>();
  const React = await import("react");
  const { TextInput } = await import("react-native");
  const Slot = ({ children }: any) =>
    React.createElement(React.Fragment, null, children);
  const Input = (props: any) => React.createElement(TextInput, props);

  return {
    ...actual,
    ActionBarPrimitive: { Copy: Slot, Edit: Slot, Reload: Slot },
    AuiIf: ({ children, condition }: any) =>
      condition(h.state)
        ? React.createElement(React.Fragment, null, children)
        : null,
    BranchPickerPrimitive: {
      Count: Slot,
      Next: Slot,
      Number: Slot,
      Previous: Slot,
    },
    ComposerPrimitive: {
      Cancel: Slot,
      Input,
      Root: Slot,
      Send: Slot,
    },
    ErrorPrimitive: { Message: Slot, Root: Slot },
    MessagePrimitive: { Attachments: Slot, Parts: Slot, Root: Slot },
    SuggestionPrimitive: { Description: Slot, Title: Slot, Trigger: Slot },
    ThreadPrimitive: { MessagesFlatList: Slot, Root: Slot, Suggestions: Slot },
    useAui: () => h.aui,
    useAuiState: (selector: (state: typeof h.state) => unknown) =>
      selector(h.state),
  };
});

vi.mock("./attachment.aui", () => ({
  ComposerAddAttachment: () => null,
  ComposerAttachments: () => null,
  UserMessageAttachments: () => null,
}));
vi.mock("./icon-button", () => ({
  groupedIconButtonHitSlop: {},
  iconButtonClassName: "",
  iconButtonHitSlop: {},
}));
vi.mock("./markdown-text", () => ({ MarkdownText: () => null }));
vi.mock("./surfaces", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./surfaces")>()),
  ShimmerLabel: () => null,
  useAnnounce: () => {},
}));
vi.mock("./typing-indicator", () => ({ TypingIndicator: () => null }));
vi.mock("@/components/ui/icon", () => ({ Icon: () => null }));
vi.mock("expo-clipboard", () => ({ setStringAsync: vi.fn() }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
vi.mock("lucide-react-native", () => ({
  ArrowUpIcon: () => null,
  CheckIcon: () => null,
  ChevronLeftIcon: () => null,
  ChevronRightIcon: () => null,
  CopyIcon: () => null,
  PencilIcon: () => null,
  RefreshCwIcon: () => null,
  WrenchIcon: () => null,
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("Thread composer hydration", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    h.hasStyleSheet = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = undefined;
    container.remove();
  });

  it("hydrates the server markup and then applies the placeholder color", async () => {
    h.hasStyleSheet = false;
    container.innerHTML = renderToString(<Thread />);
    const serverInput = container.querySelector("textarea");
    expect(serverInput?.getAttribute("style") ?? "").not.toContain(
      "--placeholderTextColor",
    );

    h.hasStyleSheet = true;
    const consoleError = vi.spyOn(console, "error");
    onTestFinished(() => consoleError.mockRestore());
    await act(async () => {
      root = hydrateRoot(container, <Thread />);
    });

    const input = container.querySelector("textarea");
    expect(input?.getAttribute("style")).toContain("--placeholderTextColor");
    expect(input?.getAttribute("style")).toContain("#71717b99");
    expect(input).toBe(serverInput);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
