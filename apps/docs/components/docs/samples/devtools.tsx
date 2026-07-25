"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowUpIcon, CloudSunIcon, SquareIcon } from "lucide-react";
import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  DevToolsHooks,
  DevToolsProviderApi,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantInstructions,
  useAssistantTool,
  useAui,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  DevToolsPanel,
  ShadowRoot,
  inProcessClient,
  type DevToolsClient,
  type DevToolsSnapshot,
} from "@assistant-ui/react-devtools";
import { SampleFrame } from "./sample-frame";

const RESPONSES = [
  "Watch the DevTools panel: the **Activity** tab captured every event this message produced, and the **Thread** tab is updating as this reply streams in.",
  "Each reply streams word by word, so the Thread tab shows the message status flipping from running to complete. Click any message in the Thread tab to inspect its parts and metadata.",
  "The Context tab lists the system instructions and the get_weather tool this demo registered — exactly what would be sent to your model provider.",
];

let responseIndex = 0;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const adapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const last = messages[messages.length - 1];
    const lastText =
      last?.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ") ?? "";

    await sleep(300);
    if (abortSignal.aborted) return;

    if (/weather/i.test(lastText)) {
      const toolCall = {
        type: "tool-call" as const,
        toolCallId: `call_${Date.now()}`,
        toolName: "get_weather",
        args: { city: "San Francisco" },
        argsText: JSON.stringify({ city: "San Francisco" }),
      };
      yield { content: [toolCall] };
      await sleep(600);
      if (abortSignal.aborted) return;
      const completedCall = {
        ...toolCall,
        result: { city: "San Francisco", tempC: 18, condition: "Foggy" },
      };
      yield { content: [completedCall] };

      const reply =
        "That was a real tool call — check the Thread tab to inspect its args and result, and the Activity tab for the events it fired.";
      let text = "";
      for (const word of reply.split(" ")) {
        await sleep(35);
        if (abortSignal.aborted) return;
        text += (text ? " " : "") + word;
        yield { content: [completedCall, { type: "text", text }] };
      }
      return;
    }

    const reply = RESPONSES[responseIndex++ % RESPONSES.length]!;
    let text = "";
    for (const word of reply.split(" ")) {
      await sleep(35);
      if (abortSignal.aborted) return;
      text += (text ? " " : "") + word;
      yield { content: [{ type: "text", text }] };
    }
  },
};

const initialMessages: ThreadMessageLike[] = [
  { role: "user", content: [{ type: "text", text: "What am I looking at?" }] },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "A live assistant-ui app (top) inspected by the real DevTools panel (bottom). Send a message and watch the Thread and Activity tabs react in real time.",
      },
    ],
  },
];

const isDarkMode = (): boolean =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

const subscribeToThemeChanges = (callback: () => void) => {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};

const EMPTY_SNAPSHOT: DevToolsSnapshot = { apiIds: [], byId: new Map() };

const emptyClient: DevToolsClient = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_SNAPSHOT,
  clearEvents: () => {},
};

/**
 * Wraps the default in-process client but only surfaces the demo's own
 * instance, so the panel never lists the docs site's assistants (which also
 * register with the shared DevToolsHooks registry in development builds).
 */
const createScopedClient = (apiId: number): DevToolsClient => {
  let lastInput: DevToolsSnapshot | null = null;
  let lastOutput: DevToolsSnapshot = EMPTY_SNAPSHOT;
  return {
    subscribe: (listener) => inProcessClient.subscribe(listener),
    getSnapshot: () => {
      const input = inProcessClient.getSnapshot();
      if (input !== lastInput) {
        lastInput = input;
        lastOutput = {
          apiIds: input.apiIds.filter((id) => id === apiId),
          byId: input.byId,
        };
      }
      return lastOutput;
    },
    getServerSnapshot: () => EMPTY_SNAPSHOT,
    clearEvents: (id) => inProcessClient.clearEvents(id),
    switchToThread: (id, threadId) =>
      inProcessClient.switchToThread?.(id, threadId),
  };
};

/**
 * Registers the demo's client with DevToolsHooks manually: the automatic
 * registration in AssistantRuntimeProvider is disabled in production builds,
 * where the docs site runs. Reports the assigned api id so the panel can be
 * scoped to this instance.
 */
function DevToolsWiring({
  onApiId,
}: {
  onApiId: (apiId: number | null) => void;
}) {
  const aui = useAui();
  useAssistantInstructions(
    "You are the assistant-ui docs demo assistant. Keep replies short and reference the assistant-ui DevTools.",
  );
  useAssistantTool<
    { city: string },
    { city: string; tempC: number; condition: string }
  >({
    toolName: "get_weather",
    description: "Get the current weather for a city",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
      },
      required: ["city"],
    },
    render: ({ args, result }) => (
      <div className="border-border/50 bg-muted/50 my-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
        <CloudSunIcon className="text-muted-foreground size-3.5 shrink-0" />
        {result ? (
          <span>
            get_weather({args.city}) → {result.tempC}°C, {result.condition}
          </span>
        ) : (
          <span className="text-muted-foreground">
            get_weather({args.city ?? "…"}) running…
          </span>
        )}
      </div>
    ),
  });
  useEffect(() => {
    const unregister = DevToolsProviderApi.register(aui);
    let apiId: number | null = null;
    for (const [id, entry] of DevToolsHooks.getApis()) {
      if (entry.api === aui) apiId = id;
    }
    onApiId(apiId);
    return () => {
      onApiId(null);
      unregister();
    };
  }, [aui, onApiId]);
  return null;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="bg-foreground/5 max-w-[85%] rounded-lg px-3 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="px-1 py-2 text-sm">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

const SUGGESTIONS = [
  {
    prompt: "What's the weather in San Francisco?",
    label: "Trigger a tool call",
  },
  {
    prompt: "How does streaming show up in DevTools?",
    label: "Stream a reply",
  },
];

function Composer() {
  return (
    <ComposerPrimitive.Root className="pt-2 pb-3">
      <div className="flex gap-2 pb-2">
        {SUGGESTIONS.map((s) => (
          <ThreadPrimitive.Suggestion
            key={s.prompt}
            prompt={s.prompt}
            send
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full border px-3 py-1 text-xs transition-colors"
          >
            {s.label}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
      <div className="border-border bg-background focus-within:border-foreground/60 flex items-end rounded-lg border transition-colors">
        <ComposerPrimitive.Input
          placeholder="Send a message and watch DevTools react…"
          className="placeholder:text-muted-foreground field-sizing-content max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 focus:outline-none"
          rows={1}
        />
        <div className="p-1.5">
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send className="bg-foreground text-background flex size-7 items-center justify-center rounded-md transition-opacity disabled:opacity-30">
              <ArrowUpIcon className="size-4" />
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <ComposerPrimitive.Cancel className="bg-foreground text-background flex size-7 items-center justify-center rounded-md">
              <SquareIcon className="size-3 fill-current" />
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

export function DevToolsSample() {
  const runtime = useLocalRuntime(adapter, { initialMessages });
  const [apiId, setApiId] = useState<number | null>(null);
  const client = useMemo(
    () => (apiId === null ? emptyClient : createScopedClient(apiId)),
    [apiId],
  );
  const darkMode = useSyncExternalStore(
    subscribeToThemeChanges,
    isDarkMode,
    () => false,
  );
  const theme = darkMode ? "dark" : "light";

  return (
    <SampleFrame className="bg-muted/40 flex h-auto flex-col overflow-hidden">
      <AssistantRuntimeProvider runtime={runtime}>
        <DevToolsWiring onApiId={setApiId} />
        <ThreadPrimitive.Root className="flex h-72 flex-col">
          <ThreadPrimitive.Viewport className="flex flex-1 scrollbar-none flex-col gap-1 overflow-y-auto px-4 pt-4">
            <ThreadPrimitive.Messages
              components={{ UserMessage, AssistantMessage }}
            />
            <ThreadPrimitive.ViewportFooter className="bg-muted/0 sticky bottom-0 mt-auto">
              <Composer />
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
        <div className="border-border/50 bg-background h-80 shrink-0 overflow-hidden rounded-b-xl border-t">
          <ShadowRoot theme={theme} className="h-full">
            <DevToolsPanel theme={theme} client={client} />
          </ShadowRoot>
        </div>
      </AssistantRuntimeProvider>
    </SampleFrame>
  );
}

const modalInitialMessages: ThreadMessageLike[] = [
  {
    role: "user",
    content: [{ type: "text", text: "Where are the DevTools?" }],
  },
  {
    role: "assistant",
    content: [
      {
        type: "text",
        text: "Click the launcher in the lower-right corner of this frame — the same button DevToolsModal renders in your app during development.",
      },
    ],
  },
];

/**
 * Recreates the DevToolsModal launcher-and-window experience contained inside
 * the sample frame. The shipped DevToolsModal cannot be used here: it renders
 * null in production builds, and its overlay positions itself fixed over the
 * whole page. The panel inside the window is the real DevToolsPanel.
 */
export function DevToolsModalSample() {
  const runtime = useLocalRuntime(adapter, {
    initialMessages: modalInitialMessages,
  });
  const [apiId, setApiId] = useState<number | null>(null);
  const client = useMemo(
    () => (apiId === null ? emptyClient : createScopedClient(apiId)),
    [apiId],
  );
  const darkMode = useSyncExternalStore(
    subscribeToThemeChanges,
    isDarkMode,
    () => false,
  );
  const theme = darkMode ? "dark" : "light";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <SampleFrame className="bg-muted/40 relative h-120 overflow-hidden">
      <AssistantRuntimeProvider runtime={runtime}>
        <DevToolsWiring onApiId={setApiId} />
        <div className="flex h-full flex-col">
          <div className="border-border/50 bg-background flex items-center justify-between gap-2 rounded-t-xl border-b px-4 py-2.5">
            <span className="text-sm font-medium">Your app</span>
            <ThreadPrimitive.Suggestion
              prompt="What's the weather in San Francisco?"
              send
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full border px-3 py-1 text-xs transition-colors"
            >
              Run a demo turn
            </ThreadPrimitive.Suggestion>
          </div>
          <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
            <ThreadPrimitive.Viewport className="flex flex-1 scrollbar-none flex-col gap-1 overflow-y-auto px-4 py-4">
              <ThreadPrimitive.Messages
                components={{ UserMessage, AssistantMessage }}
              />
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>
        </div>

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open assistant-ui DevTools"
            title="Open assistant-ui DevTools"
            className="bg-foreground text-background absolute right-5 bottom-5 flex size-9 items-center justify-center rounded-full shadow-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        {open && (
          <div
            role="dialog"
            aria-label="assistant-ui DevTools"
            className="border-border bg-background absolute inset-x-3 top-14 bottom-3 flex flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            <ShadowRoot theme={theme} className="h-full">
              <DevToolsPanel
                theme={theme}
                client={client}
                onClose={() => setOpen(false)}
              />
            </ShadowRoot>
          </div>
        )}
      </AssistantRuntimeProvider>
    </SampleFrame>
  );
}
