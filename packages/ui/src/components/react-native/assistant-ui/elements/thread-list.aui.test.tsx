import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadList } from "./thread-list.aui";

const h = vi.hoisted(() => {
  const state: any = {
    threads: {
      mainThreadId: "thread-2",
      newThreadId: null,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      threadIds: ["thread-1", "thread-2"],
      archivedThreadIds: [],
      threadItems: [
        { id: "thread-1", title: "First chat" },
        { id: "thread-2", title: "Current chat" },
      ],
    },
    threadListItem: undefined,
  };
  state.optional = { thread: state.thread };
  const switchToNewThread = vi.fn();
  const switchToItem = vi.fn();
  const client: any = {
    getState: () => state,
    threads: {
      getState: () => state.threads,
      switchToNewThread,
      item: ({ index }: { index: number }) => ({
        getState: () => state.threads.threadItems[index],
        switchTo: switchToItem,
      }),
    },
    threadListItem: {
      getState: () => state.threadListItem,
      switchTo: switchToItem,
    },
  };

  return { state, client, switchToNewThread, switchToItem };
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
    accessibilityLabel,
    ...props
  }: any) =>
    React.createElement(
      "div",
      {
        ...props,
        className,
        "data-testid": testID,
        "aria-label": accessibilityLabel,
      },
      children,
    );
  const Text = ({
    children,
    className,
    testID,
    accessibilityLabel,
    ...props
  }: any) =>
    React.createElement(
      "span",
      {
        ...props,
        className,
        "data-testid": testID,
        "aria-label": accessibilityLabel,
      },
      children,
    );
  const Pressable = ({
    children,
    className,
    testID,
    accessibilityLabel,
    accessibilityRole,
    disabled,
    onPress,
    ...props
  }: any) =>
    React.createElement(
      "button",
      {
        ...props,
        className,
        "data-testid": testID,
        "aria-label": accessibilityLabel,
        "aria-disabled": disabled ? "true" : undefined,
        disabled,
        onClick: disabled ? undefined : onPress,
        role: accessibilityRole,
      },
      typeof children === "function" ? children({ pressed: false }) : children,
    );

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

  return { ...actual, FlatList, Pressable, Text, View };
});

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: () => undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  return {
    SquarePenIcon: ({ accessibilityLabel }: { accessibilityLabel?: string }) =>
      React.createElement(View, {
        testID: accessibilityLabel ?? "SquarePenIcon",
      }),
  };
});

vi.mock("expo-clipboard", () => ({ setStringAsync: vi.fn() }));
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

describe("ThreadList", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.threads.mainThreadId = "thread-2";
    h.state.threads.newThreadId = null;
    h.state.threads.threadIds = ["thread-1", "thread-2"];
    h.state.threads.threadItems = [
      { id: "thread-1", title: "First chat" },
      { id: "thread-2", title: "Current chat" },
    ];
    h.switchToNewThread.mockReset();
    h.switchToItem.mockReset();

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
      root.render(<ThreadList />);
    });
  };

  const buttons = () =>
    Array.from(container.querySelectorAll('[role="button"]')) as HTMLElement[];

  it("renders the New chat button and thread item titles", async () => {
    await render();

    expect(container.textContent).toContain("New chat");
    expect(container.textContent).toContain("First chat");
    expect(container.textContent).toContain("Current chat");
  });

  it("switches to a new thread when New chat is pressed", async () => {
    await render();

    await act(async () => {
      click(buttons()[0]);
    });

    expect(h.switchToNewThread).toHaveBeenCalledTimes(1);
  });

  it("marks the active item and switches to an item when pressed", async () => {
    await render();

    expect(buttons()[2].className).toContain("bg-muted");
    expect(
      container.querySelector(".aui-thread-list-item-title.font-semibold"),
    ).not.toBeNull();

    await act(async () => {
      click(buttons()[1]);
    });

    expect(h.switchToItem).toHaveBeenCalledTimes(1);
  });
});
