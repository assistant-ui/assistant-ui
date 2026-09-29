import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import {
  useFlueRuntimeExtras,
  type FlueRuntimeExtras,
} from "@assistant-ui/react-flue";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { FlueRuntimeProvider } from "./runtime-provider";
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

  const resetConversation = () => {
    const id = newConversationId();
    localStorage.setItem(CONVERSATION_KEY, id);
    setConversationId(id);
  };

  return (
    <FlueRuntimeProvider conversationId={conversationId}>
      <div className="bg-background flex h-dvh flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-semibold">Durable AI chat</p>
            <p className="text-muted-foreground text-xs">assistant-ui × Flue</p>
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
    </FlueRuntimeProvider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing React root element");
createRoot(root).render(<App />);
