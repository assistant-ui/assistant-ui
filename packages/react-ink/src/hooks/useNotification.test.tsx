import { act } from "react";
import { Text } from "ink";
import { cleanup, render } from "ink-testing-library";
import { afterEach, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessageLike } from "@assistant-ui/core";
import { useNotification, type NotificationEvent } from "./useNotification";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const Notifier = ({
  onNotify,
}: {
  onNotify: (event: NotificationEvent) => void;
}) => {
  const running = useAuiState((s) => s.thread.isRunning);
  useNotification({
    onTaskComplete: { custom: onNotify },
    onTaskIncomplete: { custom: onNotify },
    onNeedsInput: false,
  });
  return <Text>{running ? "running" : "idle"}</Text>;
};

const Harness = ({
  running,
  status,
  onNotify,
}: {
  running: boolean;
  status: "running" | "complete" | "incomplete";
  onNotify: (event: NotificationEvent) => void;
}) => {
  const messages: ThreadMessageLike[] = [
    {
      id: "answer",
      role: "assistant",
      content: [{ type: "text", text: "Answer" }],
      status:
        status === "running"
          ? { type: "running" }
          : status === "complete"
            ? { type: "complete", reason: "stop" }
            : { type: "incomplete", reason: "error" },
    },
  ];
  const runtime = useExternalStoreRuntime({
    isRunning: running,
    messages,
    convertMessage: (m) => m,
    onNew: async () => {},
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Notifier onNotify={onNotify} />
    </AssistantRuntimeProvider>
  );
};

afterEach(async () => {
  await act(async () => cleanup());
});

it.each(["complete", "incomplete"] as const)(
  "waits for the thread run to finish after a message becomes %s",
  async (status) => {
    const onNotify = vi.fn();
    let view!: ReturnType<typeof render>;
    await act(async () => {
      view = render(<Harness running status="running" onNotify={onNotify} />);
    });
    expect(view.lastFrame()).toBe("running");

    await act(async () => {
      view.rerender(<Harness running status={status} onNotify={onNotify} />);
    });
    expect(view.lastFrame()).toBe("running");
    expect(onNotify).not.toHaveBeenCalled();

    await act(async () => {
      view.rerender(
        <Harness running={false} status={status} onNotify={onNotify} />,
      );
    });
    expect(view.lastFrame()).toBe("idle");
    expect(onNotify).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        type: status === "complete" ? "task-complete" : "task-incomplete",
        messageId: "answer",
        ...(status === "incomplete" ? { reason: "error" } : {}),
      }),
    );
  },
);
