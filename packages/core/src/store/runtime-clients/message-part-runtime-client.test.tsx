// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../../react/runtimes/useExternalStoreRuntime";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";

afterEach(cleanup);

const messages: ThreadMessageLike[] = [
  {
    id: "message-1",
    role: "assistant",
    content: [
      {
        type: "tool-call",
        toolCallId: "tc-1",
        toolName: "delete_file",
        args: {},
        approval: {
          id: "approval-1",
          options: [{ id: "no", kind: "reject-once" }],
        },
      },
    ],
  },
];

const setup = (
  onRespondToToolApproval = vi.fn().mockResolvedValue(undefined),
) => {
  let aui!: ReturnType<typeof useAui>;
  const Consumer = () => {
    aui = useAui();
    return null;
  };
  const Harness = ({ messages }: { messages: ThreadMessageLike[] }) => {
    const runtime = useExternalStoreRuntime({
      messages,
      convertMessage: (message) => message,
      onNew: async () => {},
      onRespondToToolApproval,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Consumer />
      </AssistantRuntimeProvider>
    );
  };
  const { rerender } = render(<Harness messages={messages} />);
  const listener = vi.fn();
  aui.on({ scope: "thread", event: "part.toolApprovalResponded" }, listener);
  return {
    aui,
    listener,
    rerender: (next: ThreadMessageLike[]) =>
      rerender(<Harness messages={next} />),
    onRespondToToolApproval,
    part: aui.thread.message({ id: "message-1" }).part({ toolCallId: "tc-1" }),
  };
};

describe("MessagePartClient tool approval events", () => {
  it.each([
    [{ approved: true }, true],
    [{ optionId: "no" }, false],
  ] as const)(
    "reports the accepted response %j",
    async (response, approved) => {
      const { aui, part, listener, onRespondToToolApproval } = setup();
      const threadId = aui.threadListItem().getState().id;
      await act(async () => {
        await part.respondToToolApproval(response);
      });
      expect(onRespondToToolApproval).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledExactlyOnceWith({
        threadId,
        messageId: "message-1",
        toolCallId: "tc-1",
        approved,
      });
    },
  );

  it("reports every response the runtime accepts, without deduplication", async () => {
    // The runtime rejects a response once the gate reads as decided; before
    // that, each accepted response is a fact and consumers dedupe by thread
    // and approval id (CloudEngagementReporter does).
    const { part, listener, onRespondToToolApproval } = setup();
    await act(async () => {
      await part.respondToToolApproval({ approved: true });
      await part.respondToToolApproval({ optionId: "no" });
    });
    expect(onRespondToToolApproval).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ toolCallId: "tc-1", approved: false }),
    );
  });

  it("reports a second gate on the same part", async () => {
    const { part, listener, rerender } = setup();
    await act(async () => {
      await part.respondToToolApproval({ approved: true });
    });
    const [message] = messages as [ThreadMessageLike & { content: any[] }];
    rerender([
      {
        ...message,
        content: [{ ...message.content[0], approval: { id: "approval-2" } }],
      },
    ]);
    await act(async () => {
      await part.respondToToolApproval({ approved: false });
    });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ toolCallId: "tc-1", approved: false }),
    );
  });

  it("propagates a rejected response without emitting", async () => {
    const error = new Error("approval failed");
    const { part, listener } = setup(vi.fn().mockRejectedValue(error));
    await act(async () => {
      await expect(part.respondToToolApproval({ approved: true })).rejects.toBe(
        error,
      );
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("propagates a synchronous invalid response without emitting", () => {
    const { part, listener, onRespondToToolApproval } = setup();
    expect(() => part.respondToToolApproval({ optionId: "missing" })).toThrow(
      'Tool approval has no option with id "missing"',
    );
    expect(onRespondToToolApproval).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});
