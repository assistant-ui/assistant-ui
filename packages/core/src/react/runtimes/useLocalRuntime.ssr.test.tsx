// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { ThreadListItemRuntimeProvider } from "../providers/ThreadListItemRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useLocalRuntime } from "./useLocalRuntime";

const chatModel: ChatModelAdapter = {
  run: async () => ({ content: [] }),
};

const initialMessages: readonly ThreadMessageLike[] = [
  {
    role: "user",
    content: "What is assistant-ui?",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    role: "assistant",
    content: [
      { type: "text", text: "A chat UI toolkit." },
      { type: "tool-call", toolName: "lookup", args: {} },
    ],
    createdAt: new Date("2026-01-01T00:00:01Z"),
  },
];

const App = ({
  onRuntime,
}: {
  onRuntime: (runtime: AssistantRuntime) => void;
}) => {
  const runtime = useLocalRuntime(chatModel, { initialMessages });
  onRuntime(runtime);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <p>chat</p>
    </AssistantRuntimeProvider>
  );
};

const Outer = ({
  onRuntime,
}: {
  onRuntime: (runtime: AssistantRuntime) => void;
}) => {
  const host = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={host}>
      <ThreadListItemRuntimeProvider runtime={host.threads.mainItem}>
        <App onRuntime={onRuntime} />
      </ThreadListItemRuntimeProvider>
    </AssistantRuntimeProvider>
  );
};

const renderOnServer = (node: ReactNode) => {
  vi.stubGlobal("document", undefined);
  try {
    return renderToString(node);
  } finally {
    vi.unstubAllGlobals();
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("prerenders seeded messages without reading Math.random", () => {
  const random = vi.spyOn(Math, "random");
  let runtime: AssistantRuntime | undefined;

  renderOnServer(<Outer onRuntime={(value) => (runtime = value)} />);

  expect(random).not.toHaveBeenCalled();
  const messages = runtime!.thread.getState().messages;
  expect(messages).toHaveLength(2);
  expect(messages.map(({ role }) => role)).toEqual(["user", "assistant"]);
  expect(messages.map(({ createdAt }) => createdAt)).toEqual(
    initialMessages.map(({ createdAt }) => createdAt),
  );
  expect(messages[0]!.id).toMatch(/-message-0$/);
  expect(messages[1]!.id).toMatch(/-message-1$/);
  expect(messages[0]!.id).not.toBe(messages[1]!.id);
  expect(messages[1]!.content[1]).toMatchObject({
    type: "tool-call",
    toolCallId: expect.any(String),
  });

  let repeatedRuntime: AssistantRuntime | undefined;
  renderOnServer(<Outer onRuntime={(value) => (repeatedRuntime = value)} />);
  expect(random).not.toHaveBeenCalled();
  expect(
    repeatedRuntime!.thread.getState().messages.map(({ id }) => id),
  ).toEqual(messages.map(({ id }) => id));
  expect(repeatedRuntime!.thread.getState().messages[1]!.content[1]).toEqual(
    messages[1]!.content[1],
  );
});

it("prerenders a standalone local runtime without reading Math.random", () => {
  const random = vi.spyOn(Math, "random");

  renderOnServer(<App onRuntime={() => {}} />);

  expect(random).not.toHaveBeenCalled();
});

it("hydrates nested local message and tool call ids", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  let serverRuntime: AssistantRuntime | undefined;
  const html = renderOnServer(
    <Outer onRuntime={(runtime) => (serverRuntime = runtime)} />,
  );
  const serverMessages = serverRuntime!.thread.getState().messages;
  expect(serverMessages.map(({ id }) => id)).toEqual([
    expect.stringMatching(/-message-0$/),
    expect.stringMatching(/-message-1$/),
  ]);
  const serverToolCall = serverMessages[1]!.content[1];
  expect(serverToolCall).toMatchObject({
    type: "tool-call",
    toolCallId: expect.stringMatching(/-tool-1-1$/),
  });

  const container = document.createElement("div");
  container.innerHTML = html;
  let clientRuntime: AssistantRuntime | undefined;
  let root: ReturnType<typeof hydrateRoot> | undefined;

  try {
    await act(async () => {
      root = hydrateRoot(
        container,
        <Outer onRuntime={(runtime) => (clientRuntime = runtime)} />,
      );
    });

    const clientMessages = clientRuntime!.thread.getState().messages;
    expect(clientMessages.map(({ id }) => id)).toEqual(
      serverMessages.map(({ id }) => id),
    );
    expect(clientMessages[1]!.content[1]).toEqual(serverToolCall);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
  }
});

it("generates random initial message ids on the client", async () => {
  const random = vi.spyOn(Math, "random");
  let runtime: AssistantRuntime | undefined;
  const view = render(<Outer onRuntime={(value) => (runtime = value)} />);

  expect(random).toHaveBeenCalled();
  const messages = runtime!.thread.getState().messages;
  expect(messages).toHaveLength(2);
  expect(messages[0]!.id).not.toBe(messages[1]!.id);

  await act(async () => view.unmount());
});
