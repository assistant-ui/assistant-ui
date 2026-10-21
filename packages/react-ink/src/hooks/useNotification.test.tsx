import { act, Component, type ReactNode } from "react";
import { Text } from "ink";
import { cleanup, render } from "ink-testing-library";
import { afterEach, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { AuiConfig, AuiProvider, useAuiState } from "@assistant-ui/store";
import { resource, useResource } from "@assistant-ui/tap";
import {
  ExternalThread,
  type ExternalThreadProps,
} from "@assistant-ui/core/store";
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

const StandaloneThread = resource(function useStandaloneThread(
  props: ExternalThreadProps,
) {
  return useResource(ExternalThread(props));
});

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | undefined }
> {
  override state = { error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    return this.state.error ? (
      <Text>{this.state.error.message}</Text>
    ) : (
      this.props.children
    );
  }
}

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

it("delivers one completion notification for a standalone thread", async () => {
  const onNotify = vi.fn();
  const renderThread = (props: ExternalThreadProps) => (
    <AuiProvider config={AuiConfig({ thread: StandaloneThread(props) })}>
      <ErrorBoundary>
        <Notifier onNotify={onNotify} />
      </ErrorBoundary>
    </AuiProvider>
  );
  const message: ExternalThreadProps["messages"][number] = {
    id: "standalone-answer",
    role: "assistant",
    createdAt: new Date(0),
    content: [{ type: "text", text: "Answer" }],
    status: { type: "running" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  };
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(renderThread({ messages: [] }));
  });
  expect(view.lastFrame()).toBe("idle");

  await act(async () => {
    view.rerender(renderThread({ isRunning: true, messages: [message] }));
  });
  expect(view.lastFrame()).toBe("running");
  expect(onNotify).not.toHaveBeenCalled();

  const completed: ExternalThreadProps = {
    isRunning: false,
    messages: [{ ...message, status: { type: "complete", reason: "stop" } }],
  };
  await act(async () => {
    view.rerender(renderThread(completed));
  });
  expect(view.lastFrame()).toBe("idle");
  expect(onNotify).toHaveBeenCalledExactlyOnceWith({
    type: "task-complete",
    threadId: "unknown",
    messageId: "standalone-answer",
    title: "AI task complete",
  });

  await act(async () => {
    view.rerender(renderThread(completed));
  });
  expect(onNotify).toHaveBeenCalledTimes(1);
});
