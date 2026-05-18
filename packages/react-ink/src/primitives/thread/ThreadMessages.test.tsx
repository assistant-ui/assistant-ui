import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const hoisted = vi.hoisted(() => ({
  state: { messagesLength: 0 },
  capturedIndices: [] as number[],
  staticItemCounts: [] as number[],
  tailItemCounts: [] as number[],
}));

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    Static: <T,>({
      items,
      children,
    }: {
      items: readonly T[];
      children: (item: T, index: number) => ReactNode;
    }) => {
      hoisted.staticItemCounts.push(items.length);
      return <>{items.map((item, i) => children(item, i))}</>;
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: (s: unknown) => unknown) => {
      const state = {
        thread: { messages: { length: hoisted.state.messagesLength } },
        message: {
          role: "user" as const,
          composer: { isEditing: false },
          parts: [],
        },
      };
      return selector(state);
    },
    RenderChildrenWithAccessor: ({
      children,
    }: {
      children: (getItem: () => unknown) => ReactNode;
    }) => <>{children(() => ({}))}</>,
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    MessageByIndexProvider: ({
      index,
      children,
    }: {
      index: number;
      children: ReactNode;
    }) => {
      hoisted.capturedIndices.push(index);
      return <>{children}</>;
    },
  };
});

import { ThreadPrimitive } from "../../index";

beforeEach(() => {
  hoisted.state.messagesLength = 0;
  hoisted.capturedIndices = [];
  hoisted.staticItemCounts = [];
  hoisted.tailItemCounts = [];
});

afterEach(() => {
  cleanup();
});

describe("ThreadPrimitive.Messages", () => {
  it("renders every message when windowSize is undefined", () => {
    hoisted.state.messagesLength = 5;

    render(
      <ThreadPrimitive.Messages>
        {() => <Text>m</Text>}
      </ThreadPrimitive.Messages>,
    );

    expect(hoisted.capturedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(hoisted.staticItemCounts).toEqual([]);
  });

  it("renders nothing when there are no messages", () => {
    hoisted.state.messagesLength = 0;

    render(
      <ThreadPrimitive.Messages>
        {() => <Text>m</Text>}
      </ThreadPrimitive.Messages>,
    );

    expect(hoisted.capturedIndices).toEqual([]);
    expect(hoisted.staticItemCounts).toEqual([]);
  });

  it("keeps every message live when total fits within windowSize + windowOverscan", () => {
    hoisted.state.messagesLength = 5;

    render(
      <ThreadPrimitive.Messages windowSize={3} windowOverscan={4}>
        {() => <Text>m</Text>}
      </ThreadPrimitive.Messages>,
    );

    expect(hoisted.capturedIndices).toEqual([0, 1, 2, 3, 4]);
    expect(hoisted.staticItemCounts).toEqual([]);
  });

  it("splits long threads into a Static prefix plus live tail covering windowSize + windowOverscan", () => {
    hoisted.state.messagesLength = 20;

    render(
      <ThreadPrimitive.Messages windowSize={3} windowOverscan={4}>
        {() => <Text>m</Text>}
      </ThreadPrimitive.Messages>,
    );

    expect(hoisted.staticItemCounts.at(-1)).toBe(13);
    expect(hoisted.capturedIndices).toHaveLength(20);
    expect(hoisted.capturedIndices.slice(0, 13)).toEqual(
      Array.from({ length: 13 }, (_, i) => i),
    );
    expect(hoisted.capturedIndices.slice(13)).toEqual([
      13, 14, 15, 16, 17, 18, 19,
    ]);
  });

  it("defaults windowOverscan to 4", () => {
    hoisted.state.messagesLength = 7;

    render(
      <ThreadPrimitive.Messages windowSize={2}>
        {() => <Text>m</Text>}
      </ThreadPrimitive.Messages>,
    );

    expect(hoisted.staticItemCounts.at(-1)).toBe(1);
    expect(hoisted.capturedIndices).toHaveLength(7);
  });

  it("clamps negative windowSize and windowOverscan to 0", () => {
    hoisted.state.messagesLength = 6;

    render(
      <ThreadPrimitive.Messages windowSize={-5} windowOverscan={-2}>
        {() => <Text>m</Text>}
      </ThreadPrimitive.Messages>,
    );

    expect(hoisted.staticItemCounts.at(-1)).toBe(6);
    expect(hoisted.capturedIndices).toHaveLength(6);
  });

  it("with windowSize=0 keeps only windowOverscan messages live", () => {
    hoisted.state.messagesLength = 10;

    render(
      <ThreadPrimitive.Messages windowSize={0} windowOverscan={4}>
        {() => <Text>m</Text>}
      </ThreadPrimitive.Messages>,
    );

    expect(hoisted.staticItemCounts.at(-1)).toBe(6);
    expect(hoisted.capturedIndices).toHaveLength(10);
  });

  it("does not re-render messages on parent rerender with a stable render fn", () => {
    hoisted.state.messagesLength = 3;
    const stableRender = () => <Text>m</Text>;

    const instance = render(
      <ThreadPrimitive.Messages>{stableRender}</ThreadPrimitive.Messages>,
    );
    expect(hoisted.capturedIndices).toEqual([0, 1, 2]);

    instance.rerender(
      <ThreadPrimitive.Messages>{stableRender}</ThreadPrimitive.Messages>,
    );
    expect(hoisted.capturedIndices).toEqual([0, 1, 2]);
  });

  it("supports the components API alongside windowing", () => {
    hoisted.state.messagesLength = 4;
    const Message = () => <Text>m</Text>;

    render(
      <ThreadPrimitive.Messages windowSize={2} components={{ Message }} />,
    );

    expect(hoisted.capturedIndices).toEqual([0, 1, 2, 3]);
  });

  it("does not re-render messages when an inline components literal is passed", () => {
    hoisted.state.messagesLength = 3;
    const Message = () => <Text>m</Text>;

    const App = () => <ThreadPrimitive.Messages components={{ Message }} />;

    const instance = render(<App />);
    expect(hoisted.capturedIndices).toEqual([0, 1, 2]);

    instance.rerender(<App />);
    expect(hoisted.capturedIndices).toEqual([0, 1, 2]);
  });
});
