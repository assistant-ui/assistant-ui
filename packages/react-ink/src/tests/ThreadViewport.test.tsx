import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const mockUseAuiState = vi.fn();
const mockUseAuiEvent = vi.fn();
const mockUseBoxMetrics = vi.fn();

type UseAuiStateSelector = Parameters<
  typeof import("@assistant-ui/store")["useAuiState"]
>[0];
type InputHandler = Parameters<typeof import("ink")["useInput"]>[0];
type InputOptions = Parameters<typeof import("ink")["useInput"]>[1];

let state = {
  thread: {
    messages: [] as Array<{
      id: string;
      role: "user" | "assistant" | "system";
      content: Array<{ type: "text"; text: string }>;
      metadata: { custom: Record<string, unknown> };
    }>,
  },
  message: {
    role: "user",
    composer: { isEditing: false },
  },
};
const inputHandlers: Array<{
  handler: InputHandler;
  options: InputOptions;
}> = [];

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const sendInput = async (input: string, key: Parameters<InputHandler>[1]) => {
  for (const entry of inputHandlers) {
    if (entry.options?.isActive === false) continue;
    entry.handler(input, key);
  }
  await flush();
};

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
    useAuiEvent: (...args: unknown[]) => mockUseAuiEvent(...args),
    RenderChildrenWithAccessor: ({
      children,
      getItemState,
    }: {
      children: (getItem: () => unknown) => ReactNode;
      getItemState: (aui: unknown) => unknown;
    }) => children(() => getItemState(mockAui)),
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    MessageByIndexProvider: ({ children }: { children: ReactNode }) => (
      <>{children}</>
    ),
  };
});

vi.mock("ink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ink")>();
  return {
    ...actual,
    useFocus: () => ({ isFocused: true }),
    useInput: (handler: InputHandler, options: InputOptions) => {
      inputHandlers.push({ handler, options });
    },
    useBoxMetrics: (...args: unknown[]) => mockUseBoxMetrics(...args),
  };
});

const mockAui = {
  thread: () => ({
    message: ({ index }: { index: number }) => ({
      getState: () => state.thread.messages[index],
    }),
  }),
};

import { ThreadPrimitive } from "../index";

const MessageText = ({
  message,
}: {
  message: (typeof state.thread.messages)[number];
}) => <Text>{message.id}</Text>;

const setMessages = (
  ids: string[],
  contentById: Record<string, string> = {},
) => {
  state = {
    ...state,
    thread: {
      messages: ids.map((id, index) => ({
        id,
        role: index % 2 === 0 ? "user" : "assistant",
        content: contentById[id]
          ? [{ type: "text", text: contentById[id] }]
          : [],
        metadata: { custom: {} },
      })),
    },
  };
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  inputHandlers.length = 0;
  mockUseBoxMetrics.mockReturnValue({
    height: 1,
    width: 20,
    hasMeasured: true,
  });
  setMessages([]);
});

describe("ThreadPrimitive.Viewport", () => {
  beforeEach(() => {
    mockUseBoxMetrics.mockReturnValue({
      height: 1,
      width: 20,
      hasMeasured: true,
    });
    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector(state as never),
    );
  });

  it("renders current ThreadMessages behavior unchanged outside a viewport", async () => {
    setMessages(["a", "b", "c"]);

    const instance = render(
      <ThreadPrimitive.Messages>
        {({ message }) => <MessageText message={message} />}
      </ThreadPrimitive.Messages>,
    );
    await flush();

    expect(instance.lastFrame()).toContain("a");
    expect(instance.lastFrame()).toContain("b");
    expect(instance.lastFrame()).toContain("c");
  });

  it("renders bounded history inside a viewport and handles page/home/end keys", async () => {
    setMessages(["a", "b", "c", "d"]);

    const instance = render(
      <ThreadPrimitive.Viewport height={2}>
        <ThreadPrimitive.Messages>
          {({ message }) => <MessageText message={message} />}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>,
    );
    await flush();

    expect(instance.lastFrame()).not.toContain("a");
    expect(instance.lastFrame()).toContain("c");
    expect(instance.lastFrame()).toContain("d");

    await sendInput("", { pageUp: true });
    expect(instance.lastFrame()).toContain("a");
    expect(instance.lastFrame()).toContain("b");

    await sendInput("", { end: true });
    expect(instance.lastFrame()).toContain("c");
    expect(instance.lastFrame()).toContain("d");

    await sendInput("", { home: true });
    expect(instance.lastFrame()).toContain("a");
    expect(instance.lastFrame()).toContain("b");

    await sendInput("", { pageDown: true });
    expect(instance.lastFrame()).toContain("c");
    expect(instance.lastFrame()).toContain("d");
  });

  it("does not bind viewport input when keybindings are disabled", async () => {
    setMessages(["a", "b", "c", "d"]);

    const instance = render(
      <ThreadPrimitive.Viewport height={2} keybindings={false}>
        <ThreadPrimitive.Messages>
          {({ message }) => <MessageText message={message} />}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>,
    );
    await flush();

    await sendInput("", { pageUp: true });

    expect(instance.lastFrame()).not.toContain("a");
    expect(instance.lastFrame()).toContain("c");
    expect(instance.lastFrame()).toContain("d");
  });

  it("keeps the bottom rows visible for a single tall message while following bottom", async () => {
    mockUseBoxMetrics.mockReturnValue({
      height: 6,
      width: 20,
      hasMeasured: true,
    });
    setMessages(["tall"]);

    const instance = render(
      <ThreadPrimitive.Viewport height={2}>
        <ThreadPrimitive.Messages>
          {() => (
            <Text>
              one{"\n"}two{"\n"}three{"\n"}four{"\n"}five{"\n"}six
            </Text>
          )}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>,
    );
    await flush();

    expect(instance.lastFrame()).not.toContain("one");
    expect(instance.lastFrame()).toContain("six");
  });

  it("uses text content as a height fallback when Ink measurement is clipped", async () => {
    mockUseBoxMetrics.mockReturnValue({
      height: 1,
      width: 20,
      hasMeasured: true,
    });
    setMessages(["tall"], {
      tall: "one\ntwo\nthree\nfour\nfive\nsix",
    });

    const instance = render(
      <ThreadPrimitive.Viewport height={2}>
        <ThreadPrimitive.Messages>
          {() => (
            <Text>
              one{"\n"}two{"\n"}three{"\n"}four{"\n"}five{"\n"}six
            </Text>
          )}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>,
    );
    await flush();

    expect(instance.lastFrame()).not.toContain("one");
    expect(instance.lastFrame()).toContain("six");
  });

  it("supports ScrollToBottom outside the clipped viewport with an explicit provider", async () => {
    setMessages(["a", "b", "c", "d"]);

    const instance = render(
      <ThreadPrimitive.ViewportProvider options={{ stickToBottomThreshold: 0 }}>
        <ThreadPrimitive.Viewport height={2}>
          <ThreadPrimitive.Messages>
            {({ message }) => <MessageText message={message} />}
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Viewport>
        <ThreadPrimitive.ScrollToBottom>
          <Text>Jump to bottom</Text>
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.ViewportProvider>,
    );
    await flush();

    expect(instance.lastFrame()).not.toContain("Jump to bottom");

    await sendInput("", { pageUp: true });
    expect(instance.lastFrame()).toContain("Jump to bottom");

    await sendInput("", { return: true });
    expect(instance.lastFrame()).not.toContain("Jump to bottom");
    expect(instance.lastFrame()).toContain("c");
    expect(instance.lastFrame()).toContain("d");
  });

  it("keeps ScrollToBottom hidden when geometry is already at bottom", async () => {
    setMessages(["a", "b"]);

    const instance = render(
      <ThreadPrimitive.ViewportProvider>
        <ThreadPrimitive.Viewport height={4}>
          <ThreadPrimitive.Messages>
            {({ message }) => <MessageText message={message} />}
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Viewport>
        <ThreadPrimitive.ScrollToBottom>
          <Text>Jump to bottom</Text>
        </ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.ViewportProvider>,
    );
    await flush();
    await sendInput("", { pageUp: true });

    expect(instance.lastFrame()).not.toContain("Jump to bottom");
  });

  it("shows and suppresses the paused hint while newer content exists below", async () => {
    setMessages(["a", "b", "c", "d"]);

    const instance = render(
      <ThreadPrimitive.Viewport height={2}>
        <ThreadPrimitive.Messages>
          {({ message }) => <MessageText message={message} />}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>,
    );
    await flush();
    await sendInput("", { pageUp: true });

    expect(instance.lastFrame()).toContain(
      "[paused | End to resume | 2 new below]",
    );

    setMessages(["a", "b", "c", "d", "e"]);
    instance.rerender(
      <ThreadPrimitive.Viewport height={2} renderPausedHint={false}>
        <ThreadPrimitive.Messages>
          {({ message }) => <MessageText message={message} />}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>,
    );
    await flush();

    expect(instance.lastFrame()).not.toContain("[paused");
  });
});
