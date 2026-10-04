import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantState } from "@assistant-ui/store";
import type { MessageState } from "@assistant-ui/core/store";
import { groupPartByType, type ThreadRow } from "@assistant-ui/core/react";
import { ThreadRowsFlatList } from "./ThreadRowsFlatList";

const h = vi.hoisted(() => ({
  state: {
    thread: {
      messages: [] as MessageState[],
      hasEarlier: false,
      isLoadingEarlier: false,
    },
    optional: {},
  },
  flatListProps: null as Record<string, unknown> | null,
  scrollToOffset: vi.fn(),
  loadEarlier: vi.fn(async () => {}),
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
      scrollToOffset: h.scrollToOffset,
    }));
    const data = props.data as ThreadRow[];
    const renderItem = props.renderItem as (value: {
      item: ThreadRow;
      index: number;
    }) => React.ReactNode;
    const keyExtractor = props.keyExtractor as (row: ThreadRow) => string;
    return React.createElement(
      "div",
      null,
      data.map((item, index) =>
        React.createElement(
          "div",
          { key: keyExtractor(item) },
          renderItem({ item, index }),
        ),
      ),
    );
  });
  return { ...actual, FlatList: FlatListMock };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => ({ thread: { loadEarlier: h.loadEarlier } }),
    useAuiState: <T,>(selector: (state: AssistantState) => T) =>
      selector(h.state as unknown as AssistantState),
    useAuiEvent: () => {},
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    ThreadPrimitiveRow: ({
      row,
      children,
    }: {
      row: ThreadRow;
      children: (info: {
        type: ThreadRow["type"];
        row: ThreadRow;
      }) => React.ReactNode;
    }) => children({ type: row.type, row }),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const message = (
  id: string,
  role: "user" | "assistant",
  parts: { type: string; text: string }[] = [],
) =>
  ({
    id,
    role,
    parts: parts.map((part) => ({ ...part, status: { type: "complete" } })),
    content: parts,
    status: { type: "complete", reason: "stop" },
    createdAt: new Date(0),
    metadata: { custom: {} },
    composer: { isEditing: false },
  }) as unknown as MessageState;

const getProps = () => {
  if (!h.flatListProps) throw new Error("FlatList was not rendered");
  return h.flatListProps;
};

const reachedInfo = { distanceFromEnd: 0 };

describe("ThreadRowsFlatList", () => {
  let container: HTMLDivElement;
  let root: Root;
  const children = (info: { type: ThreadRow["type"]; row: ThreadRow }) => (
    <span>{`${info.type}:${info.row.key}`}</span>
  );
  const mount = async (
    props: Omit<
      React.ComponentProps<typeof ThreadRowsFlatList>,
      "children"
    > = {},
  ) => {
    await act(async () => {
      root.render(
        <ThreadRowsFlatList {...props}>{children}</ThreadRowsFlatList>,
      );
    });
  };

  beforeEach(() => {
    h.state.thread.messages = [
      message("u1", "user"),
      message("a1", "assistant", [{ type: "text", text: "answer" }]),
    ];
    h.state.thread.hasEarlier = false;
    h.state.thread.isLoadingEarlier = false;
    h.flatListProps = null;
    h.scrollToOffset.mockReset();
    h.loadEarlier.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders part and turn-end rows through the render function and keys rows", async () => {
    await mount();
    const props = getProps();
    const data = props.data as ThreadRow[];
    expect(data.map((row) => row.type)).toEqual([
      "message",
      "part",
      "turn-end",
    ]);
    expect(container.textContent).toContain("part:part:a1:");
    expect(container.textContent).toContain("turn-end:turn-end:u1");
    expect((props.keyExtractor as (row: ThreadRow) => string)(data[1]!)).toBe(
      data[1]!.key,
    );
  });

  it("coalesces a reasoning run with groupBy", async () => {
    h.state.thread.messages = [
      message("a1", "assistant", [
        { type: "reasoning", text: "think" },
        { type: "reasoning", text: "more" },
        { type: "text", text: "answer" },
      ]),
    ];
    await mount({
      groupBy: groupPartByType({ reasoning: ["group-reasoning"] }),
    });
    const data = getProps().data as ThreadRow[];
    expect(data[0]).toMatchObject({
      type: "part",
      group: "group-reasoning",
      indices: [0, 1],
    });
    expect(data.map((row) => row.type)).toEqual(["part", "part", "turn-end"]);
  });

  it("anchors normal rows and pages from the start", async () => {
    h.state.thread.hasEarlier = true;
    const onStartReached = vi.fn();
    await mount({ onStartReached });
    const props = getProps();
    expect(props.maintainVisibleContentPosition).toEqual({
      minIndexForVisible: 0,
    });
    expect(props.onStartReachedThreshold).toBe(1);
    (props.onStartReached as (info: typeof reachedInfo) => void)(reachedInfo);
    expect(onStartReached).toHaveBeenCalledWith(reachedInfo);
    expect(h.loadEarlier).toHaveBeenCalledOnce();
  });

  it("reverses rows, pages from the end, and initializes at offset zero", async () => {
    h.state.thread.hasEarlier = true;
    const onStartReached = vi.fn();
    const onEndReached = vi.fn();
    await mount({ inverted: true, onStartReached, onEndReached });
    const props = getProps();
    expect((props.data as ThreadRow[]).map((row) => row.type)).toEqual([
      "turn-end",
      "part",
      "message",
    ]);
    expect(props.maintainVisibleContentPosition).toEqual({
      minIndexForVisible: 1,
      autoscrollToTopThreshold: 4,
    });
    expect(props.onEndReachedThreshold).toBe(1);
    expect(props.onStartReached).toBe(onStartReached);
    expect(h.scrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: false,
    });
    (props.onStartReached as (info: typeof reachedInfo) => void)(reachedInfo);
    expect(h.loadEarlier).not.toHaveBeenCalled();
    (props.onEndReached as (info: typeof reachedInfo) => void)(reachedInfo);
    expect(onEndReached).toHaveBeenCalledWith(reachedInfo);
    expect(h.loadEarlier).toHaveBeenCalledOnce();
  });

  it("unpins an inverted list when the offset moves away from zero", async () => {
    await mount({ inverted: true, scrollToBottomOnInitialize: false });
    const props = getProps();
    const onScroll = props.onScroll as (event: unknown) => void;
    const onContentSizeChange = props.onContentSizeChange as (
      width: number,
      height: number,
    ) => void;
    const scrollEvent = (offset: number) => ({
      nativeEvent: {
        contentOffset: { x: 0, y: offset },
        contentSize: { width: 100, height: 400 },
        layoutMeasurement: { width: 100, height: 100 },
      },
    });

    onScroll(scrollEvent(8));
    onContentSizeChange(100, 500);
    expect(h.scrollToOffset).not.toHaveBeenCalled();

    onScroll(scrollEvent(2));
    onContentSizeChange(100, 600);
    expect(h.scrollToOffset).toHaveBeenCalledWith({
      offset: 0,
      animated: false,
    });
  });
});
