"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useLocalRuntime,
  type AttachmentAdapter,
  type ChatModelAdapter,
  type FeedbackAdapter,
  type SuggestionAdapter,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import type { DocsSampleAction } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { SampleScope } from "./sample-scope";
import { useSampleAnalytics } from "./use-sample-analytics";

const REPLY = "Got it. Try the buttons under this reply, or attach a file.";
const MAX_CALLS = 8;

type AdapterName = "attachments" | "feedback" | "suggestion";
const ADAPTERS: { name: AdapterName; label: string; turnsOn: string }[] = [
  {
    name: "attachments",
    label: "attachments",
    turnsOn: "Files in the composer",
  },
  { name: "feedback", label: "feedback", turnsOn: "Thumbs under each reply" },
  {
    name: "suggestion",
    label: "suggestion",
    turnsOn: "Follow-ups after a reply",
  },
];

const TOGGLE_ACTION: Record<AdapterName, DocsSampleAction> = {
  attachments: "toggle_attachments",
  feedback: "toggle_feedback",
  suggestion: "toggle_suggestion",
};

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

/** A canned model, so the demo needs no backend. */
const model: ChatModelAdapter = {
  async *run({ abortSignal }) {
    const words = REPLY.split(" ");
    for (let i = 1; i <= words.length; i++) {
      await wait(40, abortSignal);
      if (abortSignal.aborted) return;
      yield { content: [{ type: "text", text: words.slice(0, i).join(" ") }] };
    }
  },
};

/** The calls the runtime makes to the adapters, newest last. */
class CallLog {
  private calls: readonly { id: number; text: string }[] = [];
  private readonly listeners = new Set<() => void>();
  private next = 1;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.calls;

  add(text: string) {
    this.calls = [...this.calls, { id: this.next++, text }].slice(-MAX_CALLS);
    for (const listener of this.listeners) listener();
  }
}

/** Adapters that do nothing but record each call, so the reader sees when the runtime makes it. */
function createAdapters(log: CallLog, track: (a: DocsSampleAction) => void) {
  let added = 0;
  const attachments: AttachmentAdapter = {
    accept: "*",
    async add({ file }) {
      track("attach_file");
      log.add(`attachments.add("${file.name}")`);
      return {
        id: `${file.name}-${++added}`,
        type: file.type.startsWith("image/") ? "image" : "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },
    async remove(attachment) {
      log.add(`attachments.remove("${attachment.name}")`);
    },
    async send(attachment) {
      log.add(`attachments.send("${attachment.name}")`);
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "text",
            text: `[Attached ${attachment.name}, ${attachment.file.size} bytes]`,
          },
        ],
      };
    },
  };
  const feedback: FeedbackAdapter = {
    submit({ type }) {
      track("send_feedback");
      log.add(`feedback.submit({ type: "${type}" })`);
    },
  };
  const suggestion: SuggestionAdapter = {
    async generate({ messages }) {
      log.add(`suggestion.generate({ messages: ${messages.length} })`);
      return [{ prompt: "Say it shorter" }, { prompt: "Give me an example" }];
    },
  };
  return { attachments, feedback, suggestion };
}

function Capabilities() {
  const attachments = useAuiState((s) => s.thread.capabilities.attachments);
  const feedback = useAuiState((s) => s.thread.capabilities.feedback);
  const suggestions = useAuiState((s) => s.thread.suggestions.length);
  const rows: [string, string][] = [
    ["capabilities.attachments", String(attachments)],
    ["capabilities.feedback", String(feedback)],
    ["suggestions.length", String(suggestions)],
  ];
  return (
    <dl className="grid grid-cols-[auto_auto] justify-start gap-x-3 font-mono text-[11px] leading-snug">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">thread.{key}</dt>
          <dd className={cn(value === "true" && "text-foreground")}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chat({
  enabled,
  log,
  track,
}: {
  enabled: ReadonlySet<AdapterName>;
  log: CallLog;
  track: (a: DocsSampleAction) => void;
}) {
  const all = useMemo(() => createAdapters(log, track), [log, track]);
  const runtime = useLocalRuntime(model, {
    adapters: {
      ...(enabled.has("attachments") && { attachments: all.attachments }),
      ...(enabled.has("feedback") && { feedback: all.feedback }),
      ...(enabled.has("suggestion") && { suggestion: all.suggestion }),
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid md:h-112 md:grid-cols-[minmax(0,1fr)_18rem] md:grid-rows-[minmax(0,1fr)]">
        <div className="h-104 min-w-0 md:h-auto">
          <Thread autoFocus={false} />
        </div>
        <Panel enabled={enabled} log={log} />
      </div>
    </AssistantRuntimeProvider>
  );
}

function Panel({
  enabled,
  log,
}: {
  enabled: ReadonlySet<AdapterName>;
  log: CallLog;
}) {
  const calls = useSyncExternalStore(
    log.subscribe,
    log.getSnapshot,
    log.getSnapshot,
  );
  return (
    <aside
      aria-label="Adapter calls"
      className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] flex min-w-0 flex-col gap-3 border-t p-4 text-xs md:min-h-0 md:border-t-0 md:border-l"
    >
      <div>
        <div className="text-muted-foreground mb-1">
          What the runtime reports
        </div>
        <Capabilities />
      </div>
      <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="text-muted-foreground mb-1">
          Adapter calls, newest last
        </div>
        <ol
          role="log"
          aria-relevant="additions"
          className="border-foreground/10 bg-background min-h-16 space-y-0.5 rounded-md border p-2 font-mono text-[11px] leading-snug"
        >
          {calls.length === 0 ? (
            <li className="text-muted-foreground">
              {enabled.size === 0
                ? "No adapters, so nothing to call."
                : "No calls yet. Send a message."}
            </li>
          ) : (
            calls.map((call) => (
              <li key={call.id} className="break-words">
                {call.text}
              </li>
            ))
          )}
        </ol>
      </div>
    </aside>
  );
}

function Playground() {
  const track = useSampleAnalytics("adapters-playground");
  const [enabled, setEnabled] = useState<ReadonlySet<AdapterName>>(
    () => new Set(["attachments", "feedback", "suggestion"]),
  );
  const [log] = useState(() => new CallLog());
  // Adapters are runtime options, so a change starts a fresh runtime.
  const key = [...enabled].sort().join(",");
  const toggle = (name: AdapterName) => {
    track(TOGGLE_ACTION[name]);
    const next = new Set(enabled);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    log.add(`${next.has(name) ? "+" : "−"} ${name} adapter, new runtime`);
    setEnabled(next);
  };
  return (
    <>
      <fieldset className="border-foreground/10 flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3 text-xs">
        <legend className="sr-only">Adapters passed to useLocalRuntime</legend>
        <span className="text-muted-foreground font-mono">
          useLocalRuntime(model, {"{ adapters }"})
        </span>
        {ADAPTERS.map(({ name, label, turnsOn }) => (
          <label
            key={name}
            className="flex cursor-pointer items-center gap-1.5"
            title={turnsOn}
          >
            <input
              type="checkbox"
              className="accent-foreground size-3.5"
              checked={enabled.has(name)}
              onChange={() => toggle(name)}
            />
            <span className="font-mono">{label}</span>
          </label>
        ))}
      </fieldset>
      <Chat key={key} enabled={enabled} log={log} track={track} />
    </>
  );
}

/** The Adapters concept page's playground: switch adapters on and off and watch the controls, the runtime's capabilities and the adapter calls. */
export function AdaptersPlayground() {
  return (
    <div className="not-prose border-foreground/10 rounded-document my-6 overflow-hidden border">
      <SampleScope>
        <Playground />
      </SampleScope>
    </div>
  );
}
