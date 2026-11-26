"use client";

import { useMemo, useRef } from "react";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useLocalRuntime,
  useMessageTiming,
  type ChatModelAdapter,
  type MessageTiming as MessageTimingData,
} from "@assistant-ui/react";
import { MessageTiming } from "@/components/assistant-ui/elements/message-timing.aui";
import { Button } from "@/components/ui/button";
import { SampleScope } from "./sample-scope";
import { useSampleAnalytics } from "./use-sample-analytics";

const QUESTION_ID = "timing-question";
const CREATED_AT = new Date("2026-11-26T12:00:00Z");
const ANSWER =
  "Message timing reads the stream as it arrives: when the first token landed, how long the whole reply took, and how many chunks carried it.";

type Speed = { label: string; firstTokenMs: number; chunkMs: number };
const SPEEDS = {
  fast: { label: "Fast model", firstTokenMs: 250, chunkMs: 25 },
  slow: { label: "Slow model", firstTokenMs: 1200, chunkMs: 90 },
} satisfies Record<string, Speed>;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/** A canned model that records its own timing, as a `LocalRuntime` adapter does in `metadata.timing`. */
function createModel(speed: { current: Speed }): ChatModelAdapter {
  return {
    async *run({ abortSignal }) {
      const { firstTokenMs, chunkMs } = speed.current;
      const streamStartTime = Date.now();
      let firstTokenTime: number | undefined;
      let chunks = 0;
      const words = ANSWER.split(" ");
      const timing = (done: boolean): MessageTimingData => {
        const elapsed = Date.now() - streamStartTime;
        // About four characters per token, as the client-side trackers estimate.
        const tokenCount = Math.round(
          words.slice(0, chunks).join(" ").length / 4,
        );
        return {
          streamStartTime,
          ...(firstTokenTime !== undefined && { firstTokenTime }),
          totalChunks: chunks,
          toolCallCount: 0,
          ...(done && {
            totalStreamTime: elapsed,
            tokenCount,
            tokensPerSecond: tokenCount / (elapsed / 1000),
          }),
        };
      };
      await wait(firstTokenMs, abortSignal);
      for (let i = 1; i <= words.length; i++) {
        if (abortSignal.aborted) return;
        chunks = i;
        firstTokenTime ??= Date.now() - streamStartTime;
        yield {
          content: [{ type: "text", text: words.slice(0, i).join(" ") }],
          metadata: { timing: timing(false) },
        };
        await wait(chunkMs, abortSignal);
      }
      yield {
        content: [{ type: "text", text: ANSWER }],
        metadata: { timing: timing(true) },
      };
    },
  };
}

const ms = (value: number | undefined) =>
  value === undefined ? "—" : `${Math.round(value)} ms`;

/** The raw `useMessageTiming()` values next to the badge that renders them. */
function TimingReadout() {
  const timing = useMessageTiming();
  return (
    <dl className="text-muted-foreground grid grid-cols-[auto_auto] justify-start gap-x-3 font-mono text-[11px] leading-snug">
      <dt>firstTokenTime</dt>
      <dd>{ms(timing?.firstTokenTime)}</dd>
      <dt>totalStreamTime</dt>
      <dd>{ms(timing?.totalStreamTime)}</dd>
      <dt>totalChunks</dt>
      <dd>{timing?.totalChunks ?? "—"}</dd>
      <dt>tokensPerSecond</dt>
      <dd>{timing?.tokensPerSecond?.toFixed(1) ?? "—"}</dd>
    </dl>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="bg-muted max-w-[80%] rounded-2xl px-3 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-2">
      <div className="min-h-10 text-sm leading-relaxed">
        <MessagePrimitive.Parts />
      </div>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
        <div className="flex h-6 min-w-12 items-center">
          <MessageTiming className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md p-1 font-mono text-xs tabular-nums" />
        </div>
        <TimingReadout />
      </div>
    </MessagePrimitive.Root>
  );
}

function Controls({ speed }: { speed: { current: Speed } }) {
  const aui = useAui();
  const track = useSampleAnalytics("message-timing");
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const run = (next: Speed) => {
    track("change_speed");
    speed.current = next;
    aui.thread().startRun({ parentId: QUESTION_ID });
  };
  return (
    <div className="flex flex-wrap gap-2">
      {Object.values(SPEEDS).map((option) => (
        <Button
          key={option.label}
          size="sm"
          variant="outline"
          disabled={isRunning}
          onClick={() => run(option)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function Sample() {
  const speed = useRef<Speed>(SPEEDS.fast);
  const model = useMemo(() => createModel(speed), []);
  const runtime = useLocalRuntime(model, {
    initialMessages: [
      {
        id: QUESTION_ID,
        role: "user",
        content: "How long did that reply take?",
        createdAt: CREATED_AT,
      },
    ],
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            Answer with a model, then hover the badge.
          </p>
          <Controls speed={speed} />
        </div>
        <ThreadPrimitive.Root className="flex flex-col gap-4">
          <ThreadPrimitive.Messages>
            {({ message }) =>
              message.role === "user" ? <UserMessage /> : <AssistantMessage />
            }
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}

/** The Message timing element's live demo: a canned model whose speed you pick, and the real badge reading the timing it records. */
export function MessageTimingSample() {
  return (
    <div
      aria-label="Message timing demo"
      className="not-prose border-foreground/10 rounded-document my-6 w-full max-w-xl border"
    >
      <SampleScope>
        <Sample />
      </SampleScope>
    </div>
  );
}
