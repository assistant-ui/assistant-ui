"use client";

import { type FC, useMemo, useRef } from "react";
import {
  AssistantRuntimeProvider,
  useAui,
  useAuiState,
  Interactables,
  Suggestions,
  useInteractable,
  useAssistantTool,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  AuiIf,
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
  SimpleImageAttachmentAdapter,
  AssistantCloud,
  type FeedbackAdapter,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { z } from "zod";
import {
  ArrowUpIcon,
  CheckCircle2Icon,
  CircleIcon,
  ListTodoIcon,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Task = { id: string; title: string; done: boolean };
type TaskBoardState = { tasks: Task[] };

// ---------------------------------------------------------------------------
// Interactable config (stable references, defined outside the component)
// ---------------------------------------------------------------------------

const taskBoardSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      done: z.boolean(),
    }),
  ),
});

const taskBoardInitialState: TaskBoardState = { tasks: [] };

// ---------------------------------------------------------------------------
// Task Board (interactable component) + custom incremental tool
// ---------------------------------------------------------------------------

let nextTaskId = 0;

const TaskBoard: FC = () => {
  const [state, setState] = useInteractable<TaskBoardState>("taskBoard", {
    description:
      "A task board showing the user's tasks. Use the manage_tasks tool (not update_taskBoard) to add/toggle/remove/clear tasks.",
    stateSchema: taskBoardSchema,
    initialState: taskBoardInitialState,
  });

  // Register a custom frontend tool for incremental updates.
  // This avoids full-state replacement, preserving user changes (e.g. toggles).
  const setStateRef = useRef(setState);
  setStateRef.current = setState;

  useAssistantTool({
    toolName: "manage_tasks",
    description:
      'Manage tasks on the task board. Actions: "add" (requires title), "toggle" (requires id), "remove" (requires id), "clear" (no extra fields).',
    parameters: z.object({
      action: z.enum(["add", "toggle", "remove", "clear"]),
      title: z.string().optional(),
      id: z.string().optional(),
    }),
    execute: async (args) => {
      const set = setStateRef.current;
      switch (args.action) {
        case "add": {
          const id = `task-${++nextTaskId}`;
          set((prev) => ({
            tasks: [
              ...prev.tasks,
              { id, title: args.title ?? "Untitled", done: false },
            ],
          }));
          return { success: true, id };
        }
        case "toggle": {
          if (!args.id) return { success: false, error: "id is required" };
          set((prev) => ({
            tasks: prev.tasks.map((t) =>
              t.id === args.id ? { ...t, done: !t.done } : t,
            ),
          }));
          return { success: true };
        }
        case "remove": {
          if (!args.id) return { success: false, error: "id is required" };
          set((prev) => ({
            tasks: prev.tasks.filter((t) => t.id !== args.id),
          }));
          return { success: true };
        }
        case "clear": {
          set({ tasks: [] });
          return { success: true };
        }
        default:
          return { success: false, error: "Unknown action" };
      }
    },
  });

  const toggleTask = (id: string) => {
    setState((prev) => ({
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  };

  const doneCount = state.tasks.filter((t) => t.done).length;

  return (
    <div className="flex h-full flex-col border-l bg-muted/30">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ListTodoIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">Task Board</span>
        {state.tasks.length > 0 && (
          <span className="ml-auto text-muted-foreground text-xs">
            {doneCount}/{state.tasks.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {state.tasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground text-xs">
            <ListTodoIcon className="mb-2 size-8 opacity-30" />
            <p>No tasks yet.</p>
            <p className="mt-1 opacity-70">Ask the assistant to add some!</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {state.tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    task.done && "opacity-50",
                  )}
                >
                  {task.done ? (
                    <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
                  ) : (
                    <CircleIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={cn("flex-1", task.done && "line-through")}>
                    {task.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Minimal Thread UI
// ---------------------------------------------------------------------------

const MiniThread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto px-3">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex grow flex-col items-center justify-center text-center">
            <p className="font-medium text-sm">Task Assistant</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Ask me to add tasks to your board.
            </p>
          </div>
        </AuiIf>

        <ThreadPrimitive.Messages>
          {({ message }) => {
            if (message.role === "user") return <UserMsg />;
            return <AssistantMsg />;
          }}
        </ThreadPrimitive.Messages>

        <div className="min-h-6 grow" />
        <div className="sticky bottom-0 bg-background px-1 pb-3">
          <MiniSuggestions />
          <MiniComposer />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const UserMsg: FC = () => (
  <MessagePrimitive.Root className="flex justify-end py-2">
    <div className="max-w-[80%] rounded-2xl bg-primary px-3.5 py-2 text-primary-foreground text-sm">
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

const AssistantMsg: FC = () => (
  <MessagePrimitive.Root className="py-2">
    <div className="max-w-[85%] text-sm leading-relaxed [&_p]:my-1">
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

const suggestions = [
  { prompt: "Add 3 tasks for a grocery run", label: "Grocery run" },
  { prompt: "Add a task: Review the pull request", label: "Add a task" },
  { prompt: "Clear all tasks from the board", label: "Clear board" },
];

const MiniSuggestions: FC = () => {
  const isEmpty = useAuiState((s) => s.thread.isEmpty);
  if (!isEmpty) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {suggestions.map((s) => (
        <ThreadPrimitive.Suggestion
          key={s.prompt}
          prompt={s.prompt}
          send
          asChild
        >
          <button
            type="button"
            className="rounded-full border bg-background px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
          >
            {s.label}
          </button>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

const MiniComposer: FC = () => (
  <ComposerPrimitive.Root className="flex items-end gap-2 rounded-2xl border bg-muted px-3 py-2">
    <ComposerPrimitive.Input
      placeholder="Add 3 tasks for a grocery run"
      className="min-h-6 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
      rows={1}
      autoFocus
    />
    <AuiIf condition={(s) => !s.thread.isRunning}>
      <ComposerPrimitive.Send asChild>
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <ArrowUpIcon className="size-4" />
        </button>
      </ComposerPrimitive.Send>
    </AuiIf>
    <AuiIf condition={(s) => s.thread.isRunning}>
      <ComposerPrimitive.Cancel asChild>
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Square className="size-3 fill-current" />
        </button>
      </ComposerPrimitive.Cancel>
    </AuiIf>
  </ComposerPrimitive.Root>
);

// ---------------------------------------------------------------------------
// Runtime Provider: real AI backend + Interactables
// ---------------------------------------------------------------------------

const feedbackAdapter: FeedbackAdapter = { submit: () => {} };

function InteractableRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const assistantCloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
        anonymous: true,
      }),
    [],
  );

  const adapters = useMemo(
    () => ({
      speech: new WebSpeechSynthesisAdapter(),
      dictation: new WebSpeechDictationAdapter(),
      feedback: feedbackAdapter,
      attachments: new SimpleImageAttachmentAdapter(),
    }),
    [],
  );

  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    adapters,
    cloud: assistantCloud,
  });

  const aui = useAui({
    interactables: Interactables(),
    suggestions: Suggestions([
      {
        title: "Add 3 tasks",
        label: "for a grocery run",
        prompt: "Add 3 tasks for a grocery run",
      },
      {
        title: "Clear all tasks",
        label: "from the board",
        prompt: "Clear all tasks from the board",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

// ---------------------------------------------------------------------------
// Exported sample
// ---------------------------------------------------------------------------

export const InteractableSample = () => {
  return (
    <SampleFrame className="overflow-hidden bg-muted/40">
      <InteractableRuntimeProvider>
        <div className="grid h-full grid-cols-[1fr_220px]">
          <MiniThread />
          <TaskBoard />
        </div>
      </InteractableRuntimeProvider>
    </SampleFrame>
  );
};
