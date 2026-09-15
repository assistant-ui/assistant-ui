import { describe, expect, it } from "vitest";
import { act, createElement, memo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessage } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type NestedStatus = { type: "running" } | { type: "complete"; reason: "stop" };

type DelegatePart = {
  readonly type: "tool-call";
  readonly toolCallId: "delegate-1";
  readonly toolName: "delegate";
  readonly args: {};
  readonly argsText: "{}";
  readonly result?: string;
  readonly messages: readonly {
    readonly id: "nested-message";
    readonly role: "assistant";
    readonly content: readonly [];
    readonly status: NestedStatus;
    readonly metadata: {
      readonly unstable_state: {};
      readonly unstable_annotations: readonly [];
      readonly unstable_data: readonly [];
      readonly steps: readonly [];
      readonly custom: {};
    };
  }[];
};

type TextPart = { readonly type: "text"; readonly text: string };

type Message = {
  readonly id: "message-1";
  readonly role: "assistant";
  readonly content: readonly [DelegatePart, TextPart];
  readonly status: NestedStatus;
  readonly metadata: {
    readonly unstable_state: {};
    readonly unstable_annotations: readonly [];
    readonly unstable_data: readonly [];
    readonly steps: readonly [];
    readonly custom: {};
  };
};

const createMessage = (
  nestedStatus: NestedStatus,
  text: string,
  result?: string,
): Message => ({
  id: "message-1",
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "delegate-1",
      toolName: "delegate",
      args: {},
      argsText: "{}",
      ...(result !== undefined ? { result } : undefined),
      messages: [
        {
          id: "nested-message",
          role: "assistant",
          content: [],
          status: nestedStatus,
          metadata: {
            unstable_state: {},
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        },
      ],
    },
    { type: "text", text },
  ],
  status: nestedStatus,
  metadata: {
    unstable_state: {},
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const counter = createRenderCounter();

const TasksChip = memo(() => {
  useAuiState((s) => s.thread.tasks);
  counter.useRender("tasks");
  return createElement("span");
});

const mount = () => {
  let setMessages!: (
    updater: (previous: readonly Message[]) => readonly Message[],
  ) => void;
  const App = () => {
    const [messages, set] = useState<readonly Message[]>(() => [
      createMessage({ type: "running" }, ""),
    ]);
    setMessages = set;
    const runtime = useExternalStoreRuntime({
      messages: messages as unknown as readonly ThreadMessage[],
      onNew: async () => {},
    });
    return createElement(
      AssistantRuntimeProvider,
      { runtime },
      createElement(TasksChip),
    );
  };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(App)));

  return {
    appendToken: () =>
      act(() =>
        setMessages((previous) => {
          const [message] = previous;
          const [delegate, text] = message!.content;
          return [
            {
              ...message!,
              content: [delegate, { ...text, text: `${text.text}x` }],
            },
          ];
        }),
      ),
    complete: () =>
      act(() =>
        setMessages(() => [
          createMessage({ type: "complete", reason: "stop" }, "done", "done"),
        ]),
      ),
    unmount: () => act(() => root.unmount()),
  };
};

describe("thread tasks identity", () => {
  it("does not rerender a task subscriber for unrelated streamed tokens", () => {
    counter.reset();
    const app = mount();
    const mounted = counter.snapshot();

    for (let index = 0; index < 20; index += 1) app.appendToken();
    const afterTokens = counter.snapshot();

    app.complete();
    const completed = counter.snapshot();
    app.unmount();

    expect(mounted["renders:tasks"]).toBe(1);
    expect(afterTokens["renders:tasks"]).toBe(1);
    expect(completed["renders:tasks"]).toBe(2);
  });
});
