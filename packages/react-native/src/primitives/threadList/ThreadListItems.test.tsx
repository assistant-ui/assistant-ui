import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { ThreadListItems } from "./ThreadListItems";

const h = vi.hoisted(() => ({
  state: { threads: { threadIds: [] as string[] } },
  flatListProps: null as Record<string, unknown> | null,
  providerProps: vi.fn(),
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");

  const FlatListMock = React.forwardRef(function FlatListMock(
    props: Record<string, unknown>,
    _ref,
  ) {
    h.flatListProps = props;

    const data = (props.data as unknown[]) ?? [];
    const renderItem = props.renderItem as
      | ((value: { item: unknown; index: number }) => React.ReactNode)
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
          renderItem?.({ item, index }),
        ),
      ),
    );
  });

  return {
    ...actual,
    FlatList: FlatListMock,
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (s: typeof h.state) => T) => selector(h.state),
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    ThreadListItemByIndexProvider: ({
      index,
      archived,
      children,
    }: {
      index: number;
      archived: boolean;
      children?: React.ReactNode;
    }) => {
      h.providerProps({ index, archived });
      return <>{children}</>;
    },
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ThreadListItems", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.threads.threadIds = [];
    h.flatListProps = null;
    h.providerProps.mockReset();

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

  const mount = async (
    props: Partial<Parameters<typeof ThreadListItems>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ThreadListItems
          renderItem={({ threadId }) => <Text>{threadId}</Text>}
          {...props}
        />,
      );
    });
  };

  it("wraps each row in ThreadListItemByIndexProvider with its index", async () => {
    h.state.threads.threadIds = ["t-1", "t-2", "t-3"];

    await mount();

    expect(h.providerProps.mock.calls.map((call) => call[0])).toEqual([
      { index: 0, archived: false },
      { index: 1, archived: false },
      { index: 2, archived: false },
    ]);
    expect(container.textContent).toContain("t-1");
    expect(container.textContent).toContain("t-3");
  });

  it("passes threadId and index to renderItem", async () => {
    const renderItem = vi.fn(
      ({ threadId }: { threadId: string; index: number }) => (
        <Text>{threadId}</Text>
      ),
    );
    h.state.threads.threadIds = ["a", "b"];

    await mount({ renderItem });

    expect(renderItem.mock.calls.map((call) => call[0])).toEqual([
      { threadId: "a", index: 0 },
      { threadId: "b", index: 1 },
    ]);
  });

  it("keys rows by threadId via keyExtractor", async () => {
    h.state.threads.threadIds = ["t-1", "t-2"];

    await mount();

    const keyExtractor = h.flatListProps?.keyExtractor as (
      item: string,
      index: number,
    ) => string;
    expect(keyExtractor("t-1", 0)).toBe("t-1");
    expect(keyExtractor("t-2", 1)).toBe("t-2");
    expect(h.flatListProps?.data).toEqual(["t-1", "t-2"]);
  });

  it("forwards extra FlatList props", async () => {
    h.state.threads.threadIds = ["t-1"];

    await mount({ horizontal: true, testID: "thread-list" });

    expect(h.flatListProps?.horizontal).toBe(true);
    expect(h.flatListProps?.testID).toBe("thread-list");
  });
});
