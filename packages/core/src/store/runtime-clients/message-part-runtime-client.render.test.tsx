// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../../react/runtimes/useExternalStoreRuntime";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";

// Counts part client body runs: useSubscribable is the first hook the body
// calls, so one call is one run.
const runs = vi.hoisted(() => new Map<string, number>());
vi.mock("./useSubscribable", async (importOriginal) => {
  const original = await importOriginal<typeof import("./useSubscribable")>();
  const { MessagePartRuntimeImpl } =
    await import("../../runtime/api/message-part-runtime");
  return {
    useSubscribable: (
      subscribable: Parameters<typeof original.useSubscribable>[0],
    ) => {
      if (subscribable instanceof MessagePartRuntimeImpl) {
        const state = subscribable.getState();
        const key = state?.type === "tool-call" ? state.toolCallId : "text";
        runs.set(key, (runs.get(key) ?? 0) + 1);
      }
      return original.useSubscribable(subscribable);
    },
  };
});

afterEach(cleanup);

const N = 50;
const TOKENS = 10;

const seed = (tail = ""): ThreadMessageLike[] =>
  Array.from({ length: N }, (_, i) => ({
    id: `m${i}`,
    role: "assistant" as const,
    content: [
      { type: "text" as const, text: i === N - 1 ? `last${tail}` : `msg ${i}` },
      {
        type: "tool-call" as const,
        toolCallId: `tc${i}`,
        toolName: "delete_file",
        args: {},
        approval: {
          id: `approval-${i}`,
          options: [{ id: "no", kind: "reject-once" as const }],
        },
      },
    ],
  }));

const setup = () => {
  let aui!: ReturnType<typeof useAui>;
  let setMessages!: (messages: ThreadMessageLike[]) => void;
  let currentId = "t1";
  let rerender!: () => void;
  const Consumer = () => {
    aui = useAui();
    return null;
  };
  const Harness = () => {
    const [messages, set] = useState(seed);
    const [, force] = useState(0);
    setMessages = set;
    rerender = () => force((n) => n + 1);
    const runtime = useExternalStoreRuntime({
      messages,
      convertMessage: (message) => message,
      onNew: async () => {},
      onRespondToToolApproval: async () => {},
      adapters: {
        threadList: {
          threadId: currentId,
          threads: [
            { status: "regular", id: "t1", title: "one" },
            { status: "regular", id: "t2", title: "two" },
          ],
          onSwitchToThread: (threadId: string) => {
            currentId = threadId;
            rerender();
          },
          onSwitchToNewThread: () => {},
        },
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Consumer />
      </AssistantRuntimeProvider>
    );
  };
  render(<Harness />);
  runs.clear();
  return { aui, setMessages };
};

describe("MessagePartClient render cost", () => {
  it("leaves idle parts alone while another message streams", async () => {
    const { setMessages } = setup();
    const base = seed();
    for (let token = 1; token <= TOKENS; token++) {
      // Only the last message object changes per token.
      await act(async () =>
        setMessages([...base.slice(0, -1), seed(" tok".repeat(token))[N - 1]!]),
      );
    }
    // The pending gate on the first message did nothing; its part client
    // must not re-run for every token of a later message (it did once the
    // part read the assistant tap context: 2 runs per token).
    expect(runs.get("tc0") ?? 0).toBeLessThanOrEqual(1);
    // Total part body runs stay well below one per part per token.
    const total = [...runs.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(N * TOKENS);
  });

  it("reports the selected thread id at emit time", async () => {
    const { aui } = setup();
    const listener = vi.fn();
    aui.on({ scope: "thread", event: "part.toolApprovalResponded" }, listener);
    await act(async () => {
      await aui.threads.switchToThread("t2");
    });
    await act(async () => {
      await aui.thread
        .message({ id: "m0" })
        .part({ toolCallId: "tc0" })
        .respondToToolApproval({ approved: true });
    });
    expect(listener).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ threadId: "t2", approvalId: "approval-0" }),
    );
  });
});
