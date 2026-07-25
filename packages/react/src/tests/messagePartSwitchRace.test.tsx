// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { flushSync } from "react-dom";
import { useEffect, useState, type FC } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useAui, useAuiState } from "@assistant-ui/store";
import { AssistantRuntimeProvider, PartByIndexProvider } from "../context";
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

const shorterTextMessages: readonly ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [{ type: "text", text: "shorter" }],
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

const ChildrenMessage: FC = () => (
  <MessagePrimitive.Parts>
    {({ part }) => (part.type === "text" ? <TextLeaf /> : null)}
  </MessagePrimitive.Parts>
);

const InvalidPartReader: FC = () => {
  useAuiState((s) => s.part.type);
  return null;
};

const InvalidPartMessage: FC = () => (
  <PartByIndexProvider index={2}>
    <InvalidPartReader />
  </PartByIndexProvider>
);

const App: FC<{ MessageComponent?: FC }> = ({ MessageComponent = Message }) => {
  const runtime = useLocalRuntime(noOpAdapter, {
    initialMessages: textMessages,
  });
  harness.runtime = runtime;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Messages components={{ Message: MessageComponent }} />
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

  it.each([
    ["components API", Message],
    ["children API", ChildrenMessage],
  ])(
    "does not crash when the incoming message has fewer parts with the %s",
    async (_label, MessageComponent) => {
      let view!: ReturnType<typeof render>;
      await act(async () => {
        view = render(<App MessageComponent={MessageComponent} />);
      });
      await waitFor(() => expect(view.getAllByTestId("text")).toHaveLength(2));

      await act(async () => {
        harness.runtime!.thread.reset(shorterTextMessages);
      });

      await waitFor(() => expect(view.getAllByTestId("text")).toHaveLength(1));
      expect(view.getByTestId("text").textContent).toBe("shorter");
    },
  );

  it("still rejects an index that was never valid", async () => {
    await expect(
      act(async () => {
        render(<App MessageComponent={InvalidPartMessage} />);
      }),
    ).rejects.toThrow("useClientLookup: Index 2 out of bounds (length: 2)");
  });
});
