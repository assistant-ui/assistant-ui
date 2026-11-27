"use client";

import { useEffect, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  groupPartByType,
  useAuiState,
  useExternalStoreRuntime,
  type AppendMessage,
  type MessageStatus,
  type ThreadAssistantMessagePart,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SampleScope } from "./sample-scope";
import { useSampleAnalytics } from "./use-sample-analytics";

/** The same grouping the Chain of Thought guide and the Thread element use. */
const groupBy = groupPartByType({
  reasoning: ["group-chainOfThought", "group-reasoning"],
  "tool-call": ["group-chainOfThought", "group-tool"],
});

const REASONING =
  "The user wants tomorrow's forecast for Lisbon. I'll look it up before answering.";
const ANSWER =
  "Yes, light rain is likely tomorrow afternoon in Lisbon, so take an umbrella.";
const QUESTION = "Will it rain in Lisbon tomorrow?";
const RUNNING: MessageStatus = { type: "running" };
const STREAM_TICK_MS = 40;

type Message = ThreadMessageLike & { id: string };

const userMessage = (id: string, text: string): Message => ({
  id,
  role: "user",
  content: [{ type: "text", text }],
});

const emptyReply = (id: string): Message => ({
  id,
  role: "assistant",
  content: [],
  status: RUNNING,
});

const initialMessages = (): Message[] => [
  userMessage("q-1", QUESTION),
  emptyReply("a-1"),
];

function useBackend() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextId = useRef(2);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const updateReply = (
    update: (
      parts: readonly ThreadAssistantMessagePart[],
    ) => readonly ThreadAssistantMessagePart[],
    status?: MessageStatus,
  ) =>
    setMessages((all) => {
      const last = all.at(-1);
      if (!last || last.role !== "assistant") return all;
      const parts = (last.content ?? []) as ThreadAssistantMessagePart[];
      return [
        ...all.slice(0, -1),
        { ...last, content: update(parts), status: status ?? last.status },
      ];
    });

  const isRunning = messages.at(-1)?.status?.type === "running";

  const streamText = (type: "text" | "reasoning", text: string) => {
    setStreaming(true);
    updateReply((parts) => [...parts, { type, text: "" }]);
    const words = text.split(" ");
    words.forEach((_, i) => {
      later(
        () => {
          updateReply((parts) => [
            ...parts.slice(0, -1),
            { type, text: words.slice(0, i + 1).join(" ") },
          ]);
          if (i === words.length - 1) setStreaming(false);
        },
        STREAM_TICK_MS * (i + 1),
      );
    });
  };

  const callTool = () => {
    setStreaming(true);
    const toolCallId = `call-${nextId.current++}`;
    const args = { city: "Lisbon" };
    updateReply((parts) => [
      ...parts,
      {
        type: "tool-call",
        toolCallId,
        toolName: "get_weather",
        args,
        argsText: JSON.stringify(args),
      },
    ]);
    later(() => {
      updateReply((parts) =>
        parts.map((part) =>
          part.type === "tool-call" && part.toolCallId === toolCallId
            ? { ...part, result: { forecast: "light rain", chance: 0.7 } }
            : part,
        ),
      );
      setStreaming(false);
    }, 900);
  };

  const end = (status: MessageStatus) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStreaming(false);
    updateReply((parts) => parts, status);
  };

  const onNew = async (message: AppendMessage) => {
    const text = message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    const id = nextId.current++;
    setMessages((all) => [
      ...all,
      userMessage(`q-${id}`, text),
      emptyReply(`a-${id}`),
    ]);
  };

  const reset = () => {
    end(RUNNING);
    setMessages(initialMessages());
  };

  return {
    messages,
    isRunning,
    streaming,
    onNew,
    reasoning: () => streamText("reasoning", REASONING),
    text: () => streamText("text", ANSWER),
    callTool,
    finish: () => end({ type: "complete", reason: "stop" }),
    fail: () =>
      end({
        type: "incomplete",
        reason: "error",
        error: "The model provider timed out.",
      }),
    cancel: () => end({ type: "incomplete", reason: "cancelled" }),
    reset,
  };
}

const statusLabel = (status: MessageStatus | undefined) => {
  if (!status) return "none";
  return "reason" in status && status.reason
    ? `${status.type} · ${status.reason}`
    : status.type;
};

/** One unbreakable chip per key, so a path wraps between keys and never inside one. */
function GroupPath({ path }: { path: readonly string[] }) {
  if (path.length === 0)
    return <div className="text-muted-foreground">no group</div>;
  return (
    <div className="text-muted-foreground flex flex-wrap gap-x-1 font-mono">
      {path.map((key, i) => (
        <span key={key} className="whitespace-nowrap">
          {i > 0 ? "› " : ""}
          {key}
        </span>
      ))}
    </div>
  );
}

function Readout({ groups }: { groups: boolean }) {
  const reply = useAuiState((s) => s.thread.messages.at(-1));
  const status = reply?.role === "assistant" ? reply.status : undefined;
  const parts = reply?.role === "assistant" ? reply.parts : [];
  const live = status?.type === "running";

  return (
    <div className="space-y-3 text-xs">
      <div>
        <div className="text-muted-foreground mb-1">message.status</div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              live ? "bg-blue-500" : "bg-foreground/30",
            )}
          />
          <pre className="font-mono">{statusLabel(status)}</pre>
        </div>
      </div>
      <div>
        <div className="text-muted-foreground mb-1">message.parts</div>
        {parts.length === 0 ? (
          <div className="text-muted-foreground">No parts yet.</div>
        ) : (
          <ol className="space-y-1.5">
            {parts.map((part, index) => (
              <li key={index} className="leading-snug">
                <pre className="font-mono">
                  {index} {part.type}
                  {part.type === "tool-call" ? ` ${part.toolName}` : ""}
                  <span className="text-muted-foreground">
                    {" "}
                    {part.status.type}
                  </span>
                </pre>
                {groups && <GroupPath path={groupBy(part)} />}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Playground({ groups }: { groups: boolean }) {
  const backend = useBackend();
  const track = useSampleAnalytics("parts-playground");
  const act = (action: Parameters<typeof track>[0], run: () => void) => () => {
    track(action);
    run();
  };
  const runtime = useExternalStoreRuntime<Message>({
    messages: backend.messages,
    isRunning: backend.isRunning,
    convertMessage: (message) => message,
    onNew: async (message) => {
      track("send");
      return backend.onNew(message);
    },
    onCancel: async () => {
      track("stop");
      backend.cancel();
    },
  });
  const canStream = backend.isRunning && !backend.streaming;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid md:h-112 md:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="h-112 min-w-0">
          <Thread autoFocus={false} />
        </div>
        <aside
          aria-label="Backend controls"
          className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] flex flex-col gap-4 border-t p-4 md:min-h-0 md:border-t-0 md:border-l"
        >
          <div>
            <div className="text-sm font-medium">You are the backend</div>
            <p className="text-muted-foreground mt-1 text-xs">
              Stream parts into the reply, then end the run. Send a new message
              to start another turn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canStream}
              onClick={act("stream_reasoning", backend.reasoning)}
            >
              Reasoning
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canStream}
              onClick={act("tool_call", backend.callTool)}
            >
              Tool call
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canStream}
              onClick={act("stream_text", backend.text)}
            >
              Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!backend.isRunning}
              onClick={act("finish", backend.finish)}
            >
              Finish
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!backend.isRunning}
              onClick={act("fail", backend.fail)}
            >
              Fail
            </Button>
          </div>
          <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
            <Readout groups={groups} />
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-auto self-start"
            onClick={act("reset", backend.reset)}
          >
            Reset
          </Button>
        </aside>
      </div>
    </AssistantRuntimeProvider>
  );
}

export function PartsPlayground({
  groups = true,
}: {
  /** Show each part's `groupPartByType` path under it. */
  groups?: boolean;
}) {
  return (
    <div className="not-prose border-foreground/10 rounded-document my-6 overflow-hidden border">
      <SampleScope>
        <Playground groups={groups} />
      </SampleScope>
    </div>
  );
}
