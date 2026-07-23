// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { flushSync } from "react-dom";
import { useEffect, useState, type FC } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../context";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter } from "../legacy-runtime/runtime-cores/local/ChatModelAdapter";
import * as ThreadPrimitive from "../primitives/thread";
import * as MessagePrimitive from "../primitives/message";
import { useMessagePartText } from "../primitives/messagePart/useMessagePartText";
import type { AssistantRuntime, ThreadMessageLike } from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const textMessages: readonly ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      { type: "text", text: "hello" },
      { type: "text", text: "world" },
    ],
  },
];

const toolMessages: readonly ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      { type: "tool-call", toolCallId: "tc-1", toolName: "search", args: {} },
      { type: "tool-call", toolCallId: "tc-2", toolName: "search", args: {} },
    ],
  },
];

// Re-renders a mounted text-part leaf via flushSync from a store subscriber,
// mimicking a popup library or state mirror flushing synchronously inside the
// thread-switch window, before reconciliation has unmounted the stale leaf.
const harness: {
  bump: (() => void) | null;
  runtime: AssistantRuntime | null;
} = { bump: null, runtime: null };

const TextLeaf: FC = () => {
  const [, setTick] = useState(0);
  harness.bump = () => setTick((t) => t + 1);
  const part = useMessagePartText();
  const aui = useAui();
  useEffect(
    () =>
      aui.subscribe(() => {
        flushSync(() => harness.bump?.());
      }),
    [aui],
  );
  return <p data-testid="text">{part.text}</p>;
};

const Message: FC = () => (
  <MessagePrimitive.Parts
    components={{
      Text: TextLeaf,
      tools: { Fallback: () => <div data-testid="tool" /> },
    }}
  />
);

const App: FC = () => {
  const runtime = useLocalRuntime(noOpAdapter, {
    initialMessages: textMessages,
  });
  harness.runtime = runtime;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Messages components={{ Message }} />
    </AssistantRuntimeProvider>
  );
};

afterEach(() => {
  cleanup();
  harness.bump = null;
  harness.runtime = null;
});

describe("part hooks under a thread-switch race (#5118)", () => {
  it("an out-of-band flushSync re-render during the swap window does not crash", async () => {
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(<App />);
    });
    await waitFor(() => expect(view.getAllByTestId("text")).toHaveLength(2));

    await act(async () => {
      harness.runtime!.thread.reset(toolMessages);
    });

    await waitFor(() => expect(view.getAllByTestId("tool")).toHaveLength(2));
    expect(view.queryAllByTestId("text")).toHaveLength(0);
  });
});
