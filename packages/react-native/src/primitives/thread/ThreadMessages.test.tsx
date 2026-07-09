import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlatList } from "react-native";
import type { ThreadMessage } from "@assistant-ui/core";
import { ThreadMessages, ThreadMessagesFlatList } from "./ThreadMessages";

type Msg = { id: string; role: string };

const h = vi.hoisted(() => ({
  state: {
    thread: { messages: [] as Msg[] },
    message: { role: "user" as string, composer: { isEditing: false } },
  },
  itemState: { role: "user" } as { role: string },
  events: {} as Record<string, Set<() => void>>,
  flatListProps: null as Record<string, unknown> | null,
  scrollToEnd: vi.fn(),
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");

  const FlatListMock = React.forwardRef(function FlatListMock(
    props: Record<string, unknown>,
    ref,
  ) {
    h.flatListProps = props;

    React.useImperativeHandle(ref, () => ({
      scrollToEnd: h.scrollToEnd,
    }));

    const data = (props.data as unknown[]) ?? [];
    const renderItem = props.renderItem as
      | ((value: {
          item: unknown;
          index: number;
          separators: {
            highlight: () => void;
            unhighlight: () => void;
            updateProps: () => void;
          };
        }) => React.ReactNode)
      | undefined;
    const keyExtractor = props.keyExtractor as
      | ((item: unknown, index: number) => string)
      | undefined;

    return React.createElement(
      "div",
      { "data-testid": "flatlist" },
      data.map((item, index) =>
        React.createElement(
          "div",
          { key: keyExtractor?.(item, index) ?? index },
          renderItem?.({
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
    FlatList: FlatListMock,
  };
});

vi.mock("@assistant-ui/store", async () => {
  const React = await import("react");

  return {
    useAuiState: <T,>(selector: (s: typeof h.state) => T) => selector(h.state),
    useAuiEvent: (
      selector: string | { scope: string; event: string },
      callback: () => void,
    ) => {
      React.useEffect(() => {
        const event =
          typeof selector === "string"
            ? selector
            : `${selector.scope}.${selector.event}`;
        const callbacks = (h.events[event] ??= new Set());
        callbacks.add(callback);
        return () => {
          callbacks.delete(callback);
        };
      }, [selector, callback]);
    },
    RenderChildrenWithAccessor: ({
      children,
    }: {
      children: (getItem: () => unknown) => unknown;
    }) => children(() => h.itemState),
  };
});

vi.mock("@assistant-ui/core/react", () => ({
  MessageByIndexProvider: ({ children }: { children: unknown }) => children,
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ThreadMessages", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.thread.messages = [];
    h.state.message.role = "user";
    h.state.message.composer.isEditing = false;
    h.itemState = { role: "user" };
    h.events = {};
    h.flatListProps = null;
    h.scrollToEnd.mockReset();

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

  const mount = async (props: Parameters<typeof ThreadMessages>[0]) => {
    await act(async () => {
      root.render(<ThreadMessages {...props} />);
    });
  };

  const mountFlatList = async (
    props: Parameters<typeof ThreadMessagesFlatList>[0],
  ) => {
    await act(async () => {
      root.render(<ThreadMessagesFlatList {...props} />);
    });
  };

  const getFlatListProps = () => {
    const props = h.flatListProps as {
      onContentSizeChange?: (width: number, height: number) => void;
      onLayout?: (event: unknown) => void;
      onScroll?: (event: unknown) => void;
      scrollEventThrottle?: number;
    } | null;
    if (!props) throw new Error("FlatList was not rendered");
    return props;
  };

  const emit = async (event: string) => {
    await act(async () => {
      h.events[event]?.forEach((callback) => {
        callback();
      });
    });
  };

  const messageComponents = {
    Message: () => <span data-testid="c-message">message</span>,
  };

  describe("components mode dispatch", () => {
    const makeComponents = () => ({
      Message: vi.fn(() => <span data-testid="c-message">message</span>),
      EditComposer: vi.fn(() => <span data-testid="c-edit">edit</span>),
      UserEditComposer: vi.fn(() => (
        <span data-testid="c-user-edit">user-edit</span>
      )),
      AssistantEditComposer: vi.fn(() => (
        <span data-testid="c-assistant-edit">assistant-edit</span>
      )),
      SystemEditComposer: vi.fn(() => (
        <span data-testid="c-system-edit">system-edit</span>
      )),
      UserMessage: vi.fn(() => <span data-testid="c-user">user</span>),
      AssistantMessage: vi.fn(() => (
        <span data-testid="c-assistant">assistant</span>
      )),
      SystemMessage: vi.fn(() => <span data-testid="c-system">system</span>),
    });

    it("renders the user message component for a user role", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      h.state.message.role = "user";
      await mount({ components: makeComponents() });
      expect(container.querySelector('[data-testid="c-user"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="c-message"]')).toBeNull();
    });

    it("renders the assistant message component for an assistant role", async () => {
      h.state.thread.messages = [{ id: "1", role: "assistant" }];
      h.state.message.role = "assistant";
      await mount({ components: makeComponents() });
      expect(
        container.querySelector('[data-testid="c-assistant"]'),
      ).not.toBeNull();
    });

    it("renders the system message component for a system role", async () => {
      h.state.thread.messages = [{ id: "1", role: "system" }];
      h.state.message.role = "system";
      await mount({ components: makeComponents() });
      expect(
        container.querySelector('[data-testid="c-system"]'),
      ).not.toBeNull();
    });

    it("prefers the role-specific edit composer while editing", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      h.state.message.role = "user";
      h.state.message.composer.isEditing = true;
      await mount({ components: makeComponents() });
      expect(
        container.querySelector('[data-testid="c-user-edit"]'),
      ).not.toBeNull();
    });

    it("falls back to the shared EditComposer when no role edit composer exists", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      h.state.message.role = "user";
      h.state.message.composer.isEditing = true;
      const components = makeComponents() as Record<string, unknown>;
      delete components.UserEditComposer;
      await mount({ components: components as never });
      expect(container.querySelector('[data-testid="c-edit"]')).not.toBeNull();
    });

    it("falls back to the role message then Message when no edit composer exists", async () => {
      h.state.thread.messages = [{ id: "1", role: "assistant" }];
      h.state.message.role = "assistant";
      h.state.message.composer.isEditing = true;
      const components = makeComponents() as Record<string, unknown>;
      delete components.AssistantEditComposer;
      delete components.EditComposer;
      await mount({ components: components as never });
      expect(
        container.querySelector('[data-testid="c-assistant"]'),
      ).not.toBeNull();
    });

    it("falls back to Message when no role-specific component exists", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      h.state.message.role = "user";
      const components = makeComponents() as Record<string, unknown>;
      delete components.UserMessage;
      await mount({ components: components as never });
      expect(
        container.querySelector('[data-testid="c-message"]'),
      ).not.toBeNull();
    });

    it("renders nothing for a system role with no system or Message component", async () => {
      h.state.thread.messages = [{ id: "1", role: "system" }];
      h.state.message.role = "system";
      const components = makeComponents() as Record<string, unknown>;
      delete components.SystemMessage;
      delete components.Message;
      await mount({ components: components as never });
      expect(container.querySelector('[data-testid="c-system"]')).toBeNull();
      expect(container.querySelector('[data-testid="c-message"]')).toBeNull();
    });

    it("throws for an unknown role", async () => {
      h.state.thread.messages = [{ id: "1", role: "ghost" }];
      h.state.message.role = "ghost";
      await expect(mount({ components: makeComponents() })).rejects.toThrow(
        /Unknown message role/,
      );
    });
  });

  describe("children mode", () => {
    it("renders via the children render prop", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      h.itemState = { role: "user" };
      const children = vi.fn(({ message }: { message: { role: string } }) => (
        <span data-testid="child">child:{message.role}</span>
      ));
      await mount({ children });
      const el = container.querySelector('[data-testid="child"]');
      expect(el?.textContent).toBe("child:user");
      expect(children).toHaveBeenCalled();
    });
  });

  it("renders no items for an empty thread", async () => {
    h.state.thread.messages = [];
    await mount({
      components: {
        Message: () => <span data-testid="c-message">message</span>,
      } as never,
    });
    expect(container.querySelector('[data-testid="c-message"]')).toBeNull();
  });

  it("forwards refs to the underlying FlatList", async () => {
    h.state.thread.messages = [{ id: "1", role: "user" }];
    const ref = createRef<FlatList<ThreadMessage>>();

    await act(async () => {
      root.render(
        <ThreadMessages
          ref={ref}
          components={{
            Message: () => <span data-testid="c-message">message</span>,
          }}
        />,
      );
    });

    expect(ref.current).not.toBeNull();
  });

  describe("MessagesFlatList auto-scroll", () => {
    it("scrolls to the bottom when messages first appear", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];

      await mountFlatList({ components: messageComponents });

      expect(h.scrollToEnd).toHaveBeenCalledWith({ animated: false });
    });

    it("scrolls to the bottom when a run starts", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      await mountFlatList({ components: messageComponents });
      h.scrollToEnd.mockClear();

      await emit("thread.runStart");

      expect(h.scrollToEnd).toHaveBeenCalledWith({ animated: true });
    });

    it("scrolls when content grows while already at the bottom", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      await mountFlatList({ components: messageComponents });
      const props = getFlatListProps();
      h.scrollToEnd.mockClear();

      await act(async () => {
        props.onLayout?.({
          nativeEvent: { layout: { height: 100 } },
        });
        props.onScroll?.({
          nativeEvent: {
            contentOffset: { y: 0 },
            contentSize: { height: 100, width: 0 },
            layoutMeasurement: { height: 100, width: 0 },
          },
        });
        props.onContentSizeChange?.(0, 140);
      });

      expect(h.scrollToEnd).toHaveBeenCalledWith({ animated: false });
    });

    it("does not scroll when content grows after the user scrolled away", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      await mountFlatList({ components: messageComponents });
      const props = getFlatListProps();
      h.scrollToEnd.mockClear();

      await act(async () => {
        props.onLayout?.({
          nativeEvent: { layout: { height: 100 } },
        });
        props.onScroll?.({
          nativeEvent: {
            contentOffset: { y: 0 },
            contentSize: { height: 300, width: 0 },
            layoutMeasurement: { height: 100, width: 0 },
          },
        });
        props.onContentSizeChange?.(0, 340);
      });

      expect(h.scrollToEnd).not.toHaveBeenCalled();
    });

    it("honors opt-outs for automatic content growth and run-start scrolls", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      await mountFlatList({
        autoScroll: false,
        components: messageComponents,
        scrollToBottomOnRunStart: false,
      });
      const props = getFlatListProps();
      h.scrollToEnd.mockClear();

      await act(async () => {
        props.onLayout?.({
          nativeEvent: { layout: { height: 100 } },
        });
        props.onScroll?.({
          nativeEvent: {
            contentOffset: { y: 0 },
            contentSize: { height: 100, width: 0 },
            layoutMeasurement: { height: 100, width: 0 },
          },
        });
        props.onContentSizeChange?.(0, 140);
      });
      await emit("thread.runStart");

      expect(h.scrollToEnd).not.toHaveBeenCalled();
    });

    it("sets a useful default scroll throttle", async () => {
      h.state.thread.messages = [{ id: "1", role: "user" }];
      await mountFlatList({ components: messageComponents });

      expect(getFlatListProps().scrollEventThrottle).toBe(16);
    });
  });
});
