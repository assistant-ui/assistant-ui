"use client";

import { useRef, useState, type FormEvent } from "react";

type Priority = "low" | "medium" | "high";
type WorkflowStatus = "draft" | "planning" | "blocked" | "ready";

type DockState = {
  goal: string;
  priority: Priority;
  deadline: string;
  status: WorkflowStatus;
  risk: string;
  nextStep: string;
  confidence: number;
};

type DockAction =
  | "raise-priority"
  | "plan-next-step"
  | "mark-blocked"
  | "mark-ready"
  | "increase-confidence";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const INITIAL_DOCK_STATE: DockState = {
  goal: "Define launch brief",
  priority: "medium",
  deadline: "Not set",
  status: "draft",
  risk: "None",
  nextStep: "Collect requirements",
  confidence: 32,
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "assistant-0",
    role: "assistant",
    text: "Tell me your goal, deadline, and risks. I will keep the docked cards updated as we chat.",
  },
];

const extractField = (text: string, pattern: RegExp) => {
  const match = pattern.exec(text);
  return match?.[1]?.trim();
};

const applyConversationUpdate = (
  input: string,
  current: DockState,
): { next: DockState; updates: string[] } => {
  const text = input.trim();
  const lower = text.toLowerCase();
  const next: DockState = { ...current };
  const updates: string[] = [];

  const goal = extractField(text, /goal[:\s]+([^.!?\n]+)/i);
  if (goal) {
    next.goal = goal;
    updates.push(`goal: ${goal}`);
  }

  const nextStep = extractField(text, /next step[:\s]+([^.!?\n]+)/i);
  if (nextStep) {
    next.nextStep = nextStep;
    updates.push(`next step: ${nextStep}`);
  }

  const deadline = extractField(text, /deadline[:\s]+([^.!?\n]+)/i);
  if (deadline) {
    next.deadline = deadline;
    updates.push(`deadline: ${deadline}`);
  }

  if (/high priority|priority high/.test(lower)) {
    next.priority = "high";
    updates.push("priority: high");
  } else if (/low priority|priority low/.test(lower)) {
    next.priority = "low";
    updates.push("priority: low");
  } else if (/medium priority|priority medium/.test(lower)) {
    next.priority = "medium";
    updates.push("priority: medium");
  }

  const risk = extractField(text, /risk[:\s]+([^.!?\n]+)/i);
  if (risk) {
    next.risk = risk;
    updates.push(`risk: ${risk}`);
  }

  if (/blocked|blocker/.test(lower)) {
    next.status = "blocked";
    updates.push("status: blocked");
  }

  if (/planning|plan first/.test(lower)) {
    next.status = "planning";
    updates.push("status: planning");
  }

  if (/ready|ship it|approved|looks good to ship/.test(lower)) {
    next.status = "ready";
    next.risk = "None";
    updates.push("status: ready");
  }

  if (updates.length > 0) {
    next.confidence = Math.min(100, current.confidence + updates.length * 6);
  }

  return { next, updates };
};

const applyDockAction = (
  action: DockAction,
  current: DockState,
): { next: DockState; updates: string[] } => {
  const next = { ...current };
  const updates: string[] = [];

  if (action === "raise-priority") {
    next.priority =
      current.priority === "low"
        ? "medium"
        : current.priority === "medium"
          ? "high"
          : "high";
    updates.push(`priority: ${next.priority}`);
  }

  if (action === "plan-next-step") {
    next.status = "planning";
    next.nextStep = "Draft rollout checklist";
    updates.push("status: planning");
    updates.push(`next step: ${next.nextStep}`);
  }

  if (action === "mark-blocked") {
    next.status = "blocked";
    next.risk = "Waiting on legal approval";
    updates.push("status: blocked");
    updates.push(`risk: ${next.risk}`);
  }

  if (action === "mark-ready") {
    next.status = "ready";
    next.risk = "None";
    updates.push("status: ready");
    updates.push("risk: None");
  }

  if (action === "increase-confidence") {
    next.confidence = Math.min(100, current.confidence + 8);
    updates.push(`confidence: ${next.confidence}%`);
  } else if (updates.length > 0) {
    next.confidence = Math.min(100, current.confidence + updates.length * 4);
  }

  return { next, updates };
};

const statusClassName: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  planning: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  blocked: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  ready:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

const priorityClassName: Record<Priority, string> = {
  low: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
  medium:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  high: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

const SUGGESTIONS = [
  "Goal: launch onboarding checklist. High priority. Deadline: Friday.",
  "Risk: waiting on legal approval. Blocked.",
  "Ready to ship. Next step: announce rollout to beta users.",
];

export const DockedComposerComponentsDemo = () => {
  const [dock, setDock] = useState(INITIAL_DOCK_STATE);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const messageIdRef = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const appendAssistantMessage = (text: string) => {
    messageIdRef.current += 1;
    setMessages((current) => {
      const next = [
        ...current,
        {
          id: `assistant-${messageIdRef.current}`,
          role: "assistant" as const,
          text,
        },
      ];
      queueMicrotask(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        viewport.scrollTop = viewport.scrollHeight;
      });
      return next;
    });
  };

  const handleUserTurn = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    messageIdRef.current += 1;
    setMessages((current) => {
      const next = [
        ...current,
        {
          id: `user-${messageIdRef.current}`,
          role: "user" as const,
          text: trimmed,
        },
      ];
      queueMicrotask(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        viewport.scrollTop = viewport.scrollHeight;
      });
      return next;
    });

    const result = applyConversationUpdate(trimmed, dock);
    setDock(result.next);

    if (result.updates.length > 0) {
      appendAssistantMessage(
        `Updated docked components: ${result.updates.join(", ")}.`,
      );
    } else {
      appendAssistantMessage(
        "Got it. I recorded your note, and the docked components stayed the same.",
      );
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleUserTurn(input);
    setInput("");
  };

  const handleDockAction = (action: DockAction) => {
    const result = applyDockAction(action, dock);
    setDock(result.next);

    appendAssistantMessage(
      `Dock action applied (${action}): ${result.updates.join(", ")}.`,
    );
  };

  return (
    <div className="not-prose rounded-xl border bg-card">
      <div className="flex h-[32rem] flex-col">
        <div ref={viewportRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground text-sm"
                  : "max-w-[88%] rounded-2xl border bg-background px-3 py-2 text-sm"
              }
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="border-t bg-background p-4">
          <p className="mb-2 font-medium text-sm">Docked components</p>
          <p className="mb-3 text-muted-foreground text-xs">
            These cards stay above the composer and evolve as the conversation
            changes. You can update them from chat input or by clicking actions
            inside the cards.
          </p>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Goal</p>
              <p className="mt-1 font-medium text-sm">{dock.goal}</p>
              <p className="mt-2 text-muted-foreground text-xs">Priority</p>
              <span
                data-testid="dock-priority"
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-medium text-xs ${priorityClassName[dock.priority]}`}
              >
                {dock.priority}
              </span>
              <div className="mt-3 flex flex-wrap gap-1">
                <button
                  type="button"
                  data-testid="dock-action-raise-priority"
                  onClick={() => handleDockAction("raise-priority")}
                  className="rounded border px-2 py-1 text-xs hover:bg-muted"
                >
                  Raise Priority
                </button>
                <button
                  type="button"
                  data-testid="dock-action-plan-next-step"
                  onClick={() => handleDockAction("plan-next-step")}
                  className="rounded border px-2 py-1 text-xs hover:bg-muted"
                >
                  Plan Next Step
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Timeline</p>
              <p
                data-testid="dock-deadline"
                className="mt-1 font-medium text-sm"
              >
                {dock.deadline}
              </p>
              <p className="mt-2 text-muted-foreground text-xs">Status</p>
              <span
                data-testid="dock-status"
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 font-medium text-xs ${statusClassName[dock.status]}`}
              >
                {dock.status}
              </span>
              <div className="mt-3 flex flex-wrap gap-1">
                <button
                  type="button"
                  data-testid="dock-action-mark-blocked"
                  onClick={() => handleDockAction("mark-blocked")}
                  className="rounded border px-2 py-1 text-xs hover:bg-muted"
                >
                  Mark Blocked
                </button>
                <button
                  type="button"
                  data-testid="dock-action-mark-ready"
                  onClick={() => handleDockAction("mark-ready")}
                  className="rounded border px-2 py-1 text-xs hover:bg-muted"
                >
                  Mark Ready
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Execution</p>
              <p
                data-testid="dock-next-step"
                className="mt-1 font-medium text-sm"
              >
                {dock.nextStep}
              </p>
              <p className="mt-2 text-muted-foreground text-xs">Risk</p>
              <p data-testid="dock-risk" className="mt-1 text-sm">
                {dock.risk}
              </p>
              <p className="mt-2 text-muted-foreground text-xs">Confidence</p>
              <p
                data-testid="dock-confidence"
                className="mt-1 font-mono text-xs"
              >
                {dock.confidence}%
              </p>
              <button
                type="button"
                data-testid="dock-action-increase-confidence"
                onClick={() => handleDockAction("increase-confidence")}
                className="mt-3 rounded border px-2 py-1 text-xs hover:bg-muted"
              >
                Increase Confidence
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Try: Goal: ship pricing page. High priority. Deadline: Tuesday."
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-ring/20 focus-visible:ring-2"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground text-sm"
            >
              Send
            </button>
          </form>

          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleUserTurn(suggestion)}
                className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
