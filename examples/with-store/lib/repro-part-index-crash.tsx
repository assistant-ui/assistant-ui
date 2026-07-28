"use client";

// Exercises the stale part-index crash class (issues #4051 / #5121):
// on a parts shrink, tap commits first (the message client drops its part
// resources), then notifies its flat subscriber set in insertion order, so
// part leaves are notified before their parents reconcile. A subscriber that
// calls flushSync (as base-ui popups do) re-renders the stale leaf alone.
// With render-bound aui instances the leaf reads the part instance bound at
// its provider's render — stale but consistent — and the parent's
// reconciliation unmounts it afterwards.
//
// The shrink must originate OUTSIDE React's call stack (here: setTimeout,
// standing in for an SSE/network event updating the runtime). Triggered from
// inside a React event handler or effect, React refuses to flush ("flushSync
// was called from inside a lifecycle method") and defers instead — the stale
// leaf never renders alone and only a warning appears.

import { useEffect, useState, type FC } from "react";
import { flushSync } from "react-dom";
import { useAui } from "@assistant-ui/store";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useMessagePartText,
  type AssistantRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";

const noOpAdapter: ChatModelAdapter = { async *run() {} };

const longMessage: ThreadMessageLike = {
  role: "assistant",
  content: [
    { type: "text", text: "part one" },
    { type: "text", text: "part two" },
    { type: "text", text: "part three" },
  ],
};

const shortMessage: ThreadMessageLike = {
  role: "assistant",
  content: [],
};

export const reproHarness: {
  runtime: AssistantRuntime | null;
  renderLog: string[];
} = {
  runtime: null,
  renderLog: [],
};

export const shrinkParts = (runtime: AssistantRuntime) =>
  runtime.thread.reset([shortMessage]);

const TextPart: FC = () => {
  const part = useMessagePartText();
  reproHarness.renderLog.push(part.text);
  const aui = useAui();
  const [, setTick] = useState(0);
  // Mimics the base-ui popup pattern: a store subscriber that flushes
  // synchronously on every notification.
  useEffect(
    () => aui.subscribe(() => flushSync(() => setTick((t) => t + 1))),
    [aui],
  );
  return (
    <p
      data-testid="part"
      className="rounded border border-gray-200 bg-white p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    >
      {part.text}
    </p>
  );
};

const Message: FC = () => (
  <div className="space-y-2">
    <MessagePrimitive.Parts components={{ Text: TextPart }} />
  </div>
);

export const ReproPartIndexCrash: FC = () => {
  const runtime = useLocalRuntime(noOpAdapter, {
    initialMessages: [longMessage],
  });
  reproHarness.runtime = runtime;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="space-y-4">
        <button
          type="button"
          data-testid="shrink"
          onClick={() => setTimeout(() => shrinkParts(runtime), 0)}
          className="rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
        >
          Shrink parts
        </button>
        <ThreadPrimitive.Messages components={{ Message }} />
      </div>
    </AssistantRuntimeProvider>
  );
};
