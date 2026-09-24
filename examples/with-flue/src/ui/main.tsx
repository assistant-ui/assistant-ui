import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  makeAssistantDataUI,
  SimpleImageAttachmentAdapter,
  Suggestions,
} from "@assistant-ui/react";
import {
  useFlueRuntime,
  useFlueRuntimeExtras,
  type FlueRuntimeExtras,
} from "@assistant-ui/react-flue";
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const CONVERSATION_KEY = "assistant-ui-flue-conversation";

const STATUS_LABELS: Record<FlueRuntimeExtras["status"], string> = {
  idle: "Durable",
  connecting: "Connecting",
  submitted: "Queued",
  streaming: "Streaming",
  error: "Error",
};

const newConversationId = () => crypto.randomUUID();

const loadConversationId = () => {
  const saved = localStorage.getItem(CONVERSATION_KEY);
  if (saved) return saved;
  const id = newConversationId();
  localStorage.setItem(CONVERSATION_KEY, id);
  return id;
};

type JobProgress = {
  status: "running" | "done";
  step: string;
  progress: number;
};

const JobProgressUI = makeAssistantDataUI<JobProgress>({
  name: "jobProgress",
  render: ({ data }) => (
    <div
      className="bg-card my-3 rounded-xl border p-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Durable Flue job</p>
          <p className="text-muted-foreground text-xs">{data.step}</p>
        </div>
        <span className="bg-muted rounded-full px-2 py-1 font-mono text-xs tabular-nums">
          {data.progress}%
        </span>
      </div>
      <div
        className="bg-muted mt-3 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={data.step}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={data.progress}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${data.progress}%` }}
        />
      </div>
    </div>
  ),
});

const config = AuiConfig({
  suggestions: Suggestions([
    {
      title: "Run the demo",
      label: "stream durable tool progress",
      prompt: "Run the durable integration demo.",
    },
    {
      title: "Test reconnection",
      label: "then reload this page",
      prompt: "Create another durable run that I can reconnect to.",
    },
  ]),
});

function FlueStatus() {
  const { error, status } = useFlueRuntimeExtras();

  return (
    <span
      className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs"
      role="status"
      aria-live="polite"
      aria-label={error ? `Flue error: ${error.message}` : undefined}
    >
      <span
        className={
          status === "error"
            ? "bg-destructive size-1.5 rounded-full"
            : "bg-foreground/50 size-1.5 rounded-full"
        }
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function App() {
  const [conversationId, setConversationId] = useState(loadConversationId);
  const adapters = useMemo(
    () => ({ attachments: new SimpleImageAttachmentAdapter() }),
    [],
  );
  const runtime = useFlueRuntime({
    url: `/api/agents/demo/${conversationId}`,
    adapters,
  });

  const resetConversation = () => {
    const id = newConversationId();
    localStorage.setItem(CONVERSATION_KEY, id);
    setConversationId(id);
  };

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <JobProgressUI />
      <div className="bg-background flex h-dvh flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-semibold">assistant-ui × Flue</p>
            <p className="text-muted-foreground text-xs">
              Durable messages, tools, and data UI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FlueStatus />
            <button
              className="hover:bg-muted focus-visible:ring-ring active:bg-muted rounded-lg border px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              type="button"
              onClick={resetConversation}
            >
              New conversation
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1">
          <Thread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing React root element");
createRoot(root).render(<App />);
