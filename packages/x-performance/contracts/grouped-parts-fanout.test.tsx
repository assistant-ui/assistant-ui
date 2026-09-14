import { describe, expect, it } from "vitest";
import { createElement, type ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessagePrimitiveGroupedParts,
  ThreadPrimitiveMessages,
  groupPartByType,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

type Counts = {
  readonly running: number;
  readonly complete: number;
  readonly incomplete: number;
  readonly requiresAction: number;
};

type ToolCall = {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: "task";
  readonly args: {};
  readonly result?: { readonly ok: true };
};

type Msg = {
  readonly id: string;
  readonly content: readonly ToolCall[];
};

type State = {
  readonly isRunning: boolean;
  readonly content: readonly ToolCall[];
};

const counter = createRenderCounter();
let receivedCounts: Counts | undefined;

const task = (toolCallId: string, hasResult: boolean): ToolCall => ({
  type: "tool-call",
  toolCallId,
  toolName: "task",
  args: {},
  ...(hasResult ? { result: { ok: true } } : {}),
});

const convertMessage = (message: Msg): ThreadMessageLike => ({
  id: message.id,
  role: "assistant",
  content: message.content,
});

const Group = ({
  counts,
  children,
}: {
  readonly counts: Counts;
  readonly children: ReactNode;
}) => {
  counter.useRender("group");
  receivedCounts = counts;
  return children;
};

const Leaf = () => {
  const part = useAuiState((s) => s.part);
  counter.useRender("leaf");
  return createElement(
    "span",
    null,
    part.type === "tool-call" ? part.toolCallId : "",
  );
};

const GROUP_BY = groupPartByType({
  "tool-call:task": ["group-subagents"],
});

const GroupedMessage = () => (
  <MessagePrimitiveGroupedParts groupBy={GROUP_BY}>
    {({ part, children }) => {
      if (part.type === "group-subagents") {
        return <Group counts={part.counts}>{children}</Group>;
      }
      if (part.type === "tool-call") return <Leaf />;
      return null;
    }}
  </MessagePrimitiveGroupedParts>
);

const COMPONENTS = { Message: GroupedMessage };

describe("grouped parts fan-out", () => {
  it("keeps grouped tool-call updates bounded across 250 siblings", async () => {
    counter.reset();
    receivedCounts = undefined;
    let setState!: (updater: (previous: State) => State) => void;

    const App = () => {
      const [state, set] = useState<State>({
        isRunning: true,
        content: Array.from({ length: 250 }, (_, index) =>
          task(`task-${index + 1}`, index < 249),
        ),
      });
      setState = set;
      const runtime = useExternalStoreRuntime<Msg>({
        messages: [{ id: "assistant-1", content: state.content }],
        isRunning: state.isRunning,
        convertMessage,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {counter.wrapCommits(
            "thread",
            <ThreadPrimitiveMessages components={COMPONENTS} />,
          )}
        </AssistantRuntimeProvider>
      );
    };

    const root = createRoot(document.createElement("div"));
    flushSync(() => root.render(createElement(App)));
    const mounted = counter.snapshot();

    expect(receivedCounts).toEqual({
      running: 1,
      complete: 249,
      incomplete: 0,
      requiresAction: 0,
    });

    flushSync(() =>
      setState((previous) => ({
        isRunning: false,
        content: previous.content.map((part, index) =>
          index === 249 ? task(part.toolCallId, true) : part,
        ),
      })),
    );
    // The external store adapter pushes its update in a passive effect after the flush, so the group's counts settle one macrotask later.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const afterOne = counter.snapshot();
    const firstDelta = Object.fromEntries(
      Object.entries(afterOne).map(([key, value]) => [
        key,
        value - (mounted[key] ?? 0),
      ]),
    );

    expect(receivedCounts).toEqual({
      running: 0,
      complete: 250,
      incomplete: 0,
      requiresAction: 0,
    });

    flushSync(() =>
      setState((previous) => ({
        isRunning: true,
        content: [...previous.content, task("task-251", false)],
      })),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const afterTwo = counter.snapshot();
    const secondDelta = Object.fromEntries(
      Object.entries(afterTwo).map(([key, value]) => [
        key,
        value - (afterOne[key] ?? 0),
      ]),
    );

    expect(receivedCounts).toEqual({
      running: 1,
      complete: 250,
      incomplete: 0,
      requiresAction: 0,
    });

    expect(firstDelta["renders:group"]).toBe(1);
    expect(firstDelta["renders:leaf"]).toBe(1);
    expect(firstDelta["commits:thread"]).toBe(2);
    expect(secondDelta["renders:group"]).toBe(1);
    expect(secondDelta["renders:leaf"]).toBe(1);
    expect(secondDelta["commits:thread"]).toBe(2);
    expect(mounted).toEqual({
      "renders:group": 1,
      "renders:leaf": 250,
      "commits:thread": 1,
    });

    flushSync(() => root.unmount());
  });
});
