"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AssistantRuntimeProvider,
  useAssistantInstructions,
  useAssistantTool,
  useAui,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ChatModelRunResult,
  type MessageStatus,
  type ThreadAssistantMessagePart,
  type ThreadMessage,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SampleScope } from "./sample-scope";
import { useSampleAnalytics } from "./use-sample-analytics";

const QUESTION = "Will it rain in Lisbon tomorrow?";
const INSTRUCTIONS =
  "Answer weather questions. Call get_weather before you answer.";
const REASONING =
  "The user asks about rain in Lisbon tomorrow. I should check the forecast first.";
const ANSWER =
  "Light rain is likely tomorrow afternoon in Lisbon, so take an umbrella.";
const STREAM_TICK_MS = 45;
const TOOL_MS = 900;
const MAX_LOG_ENTRIES = 60;

type Command = "reasoning" | "text" | "tool" | "finish" | "fail";

type CallArgs = {
  messages: string[];
  system: string | undefined;
  tools: string[];
  runConfig: string;
};

type LogEntry = { id: number; run: number } & (
  | { kind: "call"; args: CallArgs }
  | { kind: "yield"; step: number; count: number; parts: string[] }
  | { kind: "return" | "throw" | "abort" }
  | { kind: "status"; status: string }
);

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type NewLogEntry = DistributiveOmit<LogEntry, "id">;

type Snapshot = {
  log: readonly LogEntry[];
  /** The run whose `run()` call is waiting on the reader, if any. */
  waiting: number | null;
  streaming: boolean;
};

const clip = (text: string, max = 32) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

const describePart = (part: ThreadMessage["content"][number]) => {
  switch (part.type) {
    case "text":
      return `"${clip(part.text)}"`;
    case "tool-call":
      return part.result === undefined
        ? `tool-call ${part.toolName}, no result`
        : `tool-call ${part.toolName} → ${clip(JSON.stringify(part.result), 28)}`;
    default:
      return part.type;
  }
};

const describeCall = (options: ChatModelRunOptions): CallArgs => ({
  messages: options.messages.map(
    (message) =>
      `${message.role}: ${message.content.map(describePart).join(", ") || "(empty)"}`,
  ),
  system: options.context.system,
  tools: Object.keys(options.context.tools ?? {}),
  runConfig: JSON.stringify(options.runConfig),
});

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

let toolCallCount = 0;

/** What one button press streams: each step is the whole content so far, as a run yields it. */
async function* produce(
  command: "reasoning" | "text" | "tool",
  before: readonly ThreadAssistantMessagePart[],
  signal: AbortSignal,
): AsyncGenerator<ThreadAssistantMessagePart[]> {
  if (command === "tool") {
    // The backend runs this tool itself: it streams the call, then its result.
    const args = { city: "Lisbon" };
    const call = {
      type: "tool-call" as const,
      toolCallId: `call_${++toolCallCount}`,
      toolName: "get_weather",
      args,
      argsText: JSON.stringify(args),
    };
    yield [...before, call];
    await wait(TOOL_MS, signal);
    if (signal.aborted) return;
    yield [...before, { ...call, result: { forecast: "light rain" } }];
    return;
  }
  const words = (command === "reasoning" ? REASONING : ANSWER).split(" ");
  for (let i = 1; i <= words.length; i++) {
    await wait(STREAM_TICK_MS, signal);
    if (signal.aborted) return;
    const text = words.slice(0, i).join(" ");
    yield [
      ...before,
      command === "reasoning"
        ? { type: "reasoning", text }
        : { type: "text", text },
    ];
  }
}

/**
 * A chat model adapter driven by buttons instead of a model. Each `run()` call
 * waits for the reader to stream parts, return or throw, and the log records
 * the call, everything it yields and how it ends.
 */
class ReaderBackend {
  private snapshot: Snapshot = { log: [], waiting: null, streaming: false };
  private readonly listeners = new Set<() => void>();
  private wake: { run: number; resolve: (command: Command) => void } | null =
    null;
  private runs = 0;
  private ids = 0;
  private steps = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private update(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  record(entry: NewLogEntry) {
    const log = this.snapshot.log;
    const last = log.at(-1);
    if (
      entry.kind === "yield" &&
      last?.kind === "yield" &&
      last.step === entry.step
    ) {
      this.update({
        log: [
          ...log.slice(0, -1),
          { ...last, count: last.count + 1, parts: entry.parts },
        ],
      });
      return;
    }
    this.update({
      log: [...log, { ...entry, id: ++this.ids } as LogEntry].slice(
        -MAX_LOG_ENTRIES,
      ),
    });
  }

  get currentRun() {
    return this.runs;
  }

  send(command: Command) {
    const wake = this.wake;
    this.wake = null;
    wake?.resolve(command);
  }

  private next(run: number, signal: AbortSignal) {
    return new Promise<Command | null>((resolve) => {
      if (signal.aborted) return resolve(null);
      const onAbort = () => resolve(null);
      signal.addEventListener("abort", onAbort, { once: true });
      this.wake = {
        run,
        resolve: (command) => {
          signal.removeEventListener("abort", onAbort);
          resolve(command);
        },
      };
    });
  }

  readonly adapter: ChatModelAdapter = {
    run: (options) => this.run(options),
  };

  private async *run(
    options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult, void> {
    const run = ++this.runs;
    const { abortSignal } = options;
    let ended = false;
    const end = (kind: "return" | "throw" | "abort") => {
      ended = true;
      this.record({ kind, run });
    };

    this.record({ kind: "call", run, args: describeCall(options) });
    this.update({ waiting: run, streaming: false });
    let content: ThreadAssistantMessagePart[] = [];
    try {
      for (;;) {
        const command = await this.next(run, abortSignal);
        if (command === null) return end("abort");
        if (command === "finish") return end("return");
        if (command === "fail") {
          end("throw");
          throw new Error("The model provider timed out.");
        }
        this.update({ streaming: true });
        const step = ++this.steps;
        for await (const next of produce(command, content, abortSignal)) {
          content = next;
          this.record({
            kind: "yield",
            run,
            step,
            count: 1,
            parts: content.map(describePart),
          });
          yield { content };
        }
        this.update({ streaming: false });
      }
    } finally {
      if (!ended && abortSignal.aborted) end("abort");
      if (this.wake?.run === run) this.wake = null;
      if (this.snapshot.waiting === run)
        this.update({ waiting: null, streaming: false });
    }
  }
}

const statusLabel = (status: MessageStatus | undefined) => {
  if (!status) return "none";
  return "reason" in status && status.reason
    ? `${status.type} · ${status.reason}`
    : status.type;
};

/** The system instructions and tool your app registers, which the runtime hands every `run()` call in `context`. */
function ModelContext() {
  useAssistantInstructions(INSTRUCTIONS);
  useAssistantTool({
    toolName: "get_weather",
    description: "Look up tomorrow's forecast for a city.",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  });
  return null;
}

/** Adds the runtime's own reaction to the log: each status the reply passes through. */
function StatusTrace({ backend }: { backend: ReaderBackend }) {
  const status = useAuiState((s) => {
    const last = s.thread.messages.at(-1);
    return last?.role === "assistant" ? statusLabel(last.status) : null;
  });
  const lastLogged = useRef<string | null>(null);
  useEffect(() => {
    if (status === null || status === lastLogged.current) return;
    lastLogged.current = status;
    backend.record({ kind: "status", run: backend.currentRun, status });
  }, [backend, status]);
  return null;
}

function Line({
  arrow,
  children,
  tone,
}: {
  arrow: string;
  children: React.ReactNode;
  tone?: "call" | "end" | "runtime";
}) {
  return (
    <div className="flex gap-1.5">
      <span
        aria-hidden
        className={cn(
          "w-3 shrink-0 text-center",
          tone === "call" && "text-blue-600 dark:text-blue-400",
          tone === "end" && "text-foreground",
          tone === "runtime" && "text-muted-foreground",
        )}
      >
        {arrow}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Entry({ entry }: { entry: LogEntry }) {
  switch (entry.kind) {
    case "call":
      return (
        <Line arrow="→" tone="call">
          <div className="font-medium">
            run() <span className="text-muted-foreground">#{entry.run}</span>
          </div>
          <dl className="text-muted-foreground mt-0.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
            <dt>messages</dt>
            <dd>
              {entry.args.messages.map((message, i) => (
                <div key={i} className="break-words">
                  {message}
                </div>
              ))}
            </dd>
            <dt>context</dt>
            <dd className="break-words">
              system &quot;{clip(entry.args.system ?? "", 22)}&quot;, tools [
              {entry.args.tools.join(", ")}]
            </dd>
            <dt>runConfig</dt>
            <dd>{entry.args.runConfig}</dd>
            <dt>abortSignal</dt>
            <dd>fires on Stop</dd>
          </dl>
        </Line>
      );
    case "yield":
      return (
        <Line arrow="←">
          yield{" "}
          {entry.count > 1 && (
            <span className="text-muted-foreground">×{entry.count} </span>
          )}
          {"{ content: ["}
          <span className="text-muted-foreground break-words">
            {entry.parts.join(", ")}
          </span>
          {"] }"}
        </Line>
      );
    case "return":
      return (
        <Line arrow="←" tone="end">
          return
        </Line>
      );
    case "throw":
      return (
        <Line arrow="←" tone="end">
          throw Error(&quot;The model provider timed out.&quot;)
        </Line>
      );
    case "abort":
      return (
        <Line arrow="⨯" tone="end">
          abortSignal fired; the generator stops
        </Line>
      );
    case "status":
      return (
        <Line arrow="●" tone="runtime">
          <span className="text-muted-foreground">
            message.status = {entry.status}
          </span>
        </Line>
      );
  }
}

function CallLog({ log }: { log: readonly LogEntry[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  // Scrolls the log box itself, never the page.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);
  return (
    <div
      ref={scroller}
      aria-label="Calls the runtime made"
      aria-live="polite"
      className="border-foreground/10 bg-background max-h-72 min-h-24 overflow-y-auto rounded-md border p-2 font-mono text-[11px] leading-snug md:max-h-none md:min-h-0 md:flex-1"
    >
      {log.length === 0 ? (
        <p className="text-muted-foreground">
          No calls yet. Send a message and the runtime calls run().
        </p>
      ) : (
        <div className="space-y-1.5">
          {log.map((entry) => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function Controls({
  backend,
  onReset,
}: {
  backend: ReaderBackend;
  onReset: () => void;
}) {
  const aui = useAui();
  const track = useSampleAnalytics("runtime-playground");
  const { log, waiting, streaming } = useSyncExternalStore(
    backend.subscribe,
    backend.getSnapshot,
    backend.getSnapshot,
  );
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const isEmpty = useAuiState((s) => s.thread.messages.length === 0);
  const canStream = waiting !== null && !streaming;

  // A run starts from the composer, an edit or a regenerate; the log's first call says which.
  const runs = log.filter((entry) => entry.kind === "call").length;
  const lastStop = useRef(0);
  useEffect(() => {
    if (runs > 0) track("run");
  }, [runs, track]);
  useEffect(() => {
    const aborts = log.filter((entry) => entry.kind === "abort").length;
    if (aborts > lastStop.current) track("stop");
    lastStop.current = aborts;
  }, [log, track]);

  const press = (command: Command, action: Parameters<typeof track>[0]) => {
    track(action);
    backend.send(command);
  };

  return (
    <aside
      aria-label="Model adapter controls"
      className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] flex min-w-0 flex-col gap-3 border-t p-4 md:min-h-0 md:border-t-0 md:border-l"
    >
      <div>
        <div className="text-sm font-medium">You are the model adapter</div>
        <p className="text-muted-foreground mt-1 text-xs">
          {waiting !== null
            ? `run() #${waiting} is waiting on you. Stream parts, then return or throw. Stop in the composer fires the abort signal.`
            : isRunning
              ? "The runtime is working."
              : "Send a message, edit one or regenerate a reply, and the runtime calls run()."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {waiting === null && isEmpty ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              track("send");
              aui.thread().append(QUESTION);
            }}
          >
            Ask &quot;{QUESTION}&quot;
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={!canStream}
              onClick={() => press("reasoning", "stream_reasoning")}
            >
              Reasoning
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canStream}
              onClick={() => press("tool", "tool_call")}
            >
              Tool call
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canStream}
              onClick={() => press("text", "stream_text")}
            >
              Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={waiting === null || streaming}
              onClick={() => press("finish", "finish")}
            >
              Return
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={waiting === null || streaming}
              onClick={() => press("fail", "fail")}
            >
              Throw
            </Button>
          </>
        )}
      </div>
      <CallLog log={log} />
      <Button
        size="sm"
        variant="ghost"
        className="self-start"
        onClick={() => {
          track("reset");
          onReset();
        }}
      >
        Reset
      </Button>
    </aside>
  );
}

function Playground({ onReset }: { onReset: () => void }) {
  const [backend] = useState(() => new ReaderBackend());
  const runtime = useLocalRuntime(backend.adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ModelContext />
      <StatusTrace backend={backend} />
      <div className="grid md:h-128 md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-[minmax(0,1fr)]">
        <div className="h-112 min-w-0 md:h-auto">
          <Thread autoFocus={false} />
        </div>
        <Controls backend={backend} onReset={onReset} />
      </div>
    </AssistantRuntimeProvider>
  );
}

/** The Runtime concept page's playground: a real `Thread` on `useLocalRuntime`, whose chat model adapter is the reader. */
export function RuntimePlayground() {
  const [epoch, setEpoch] = useState(0);
  return (
    <div className="not-prose border-foreground/10 rounded-document my-6 overflow-hidden border">
      <SampleScope>
        <Playground key={epoch} onReset={() => setEpoch((n) => n + 1)} />
      </SampleScope>
    </div>
  );
}
