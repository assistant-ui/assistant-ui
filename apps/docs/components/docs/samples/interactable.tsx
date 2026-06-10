"use client";

import {
  type Dispatch,
  type FC,
  type SetStateAction,
  useEffect,
  useMemo,
} from "react";
import {
  AssistantRuntimeProvider,
  AuiProvider,
  useAui,
  useAuiState,
  Interactables,
  Suggestions,
  Tools,
  useAuiToolOverrides,
  useAssistantInteractable,
  useInteractableState,
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
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import remarkGfm from "remark-gfm";
import {
  ArrowUpIcon,
  CheckCircle2Icon,
  CircleIcon,
  ListTodoIcon,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type TaskBoardState,
  taskBoardInitialState,
  taskBoardSchema,
} from "./interactable-state";
import toolkit from "./interactable-toolkit";

const TaskBoard: FC = () => {
  const id = useAssistantInteractable("taskBoard", {
    description:
      "A task board showing the user's tasks. Use the manage_tasks tool (not update_taskBoard) to add/toggle/remove/clear tasks.",
    stateSchema: taskBoardSchema,
    initialState: taskBoardInitialState,
  });
  const [state, { setState }] = useInteractableState<TaskBoardState>(
    id,
    taskBoardInitialState,
  );

  // One invariant: every task has a stable, unique id. Enforce it wherever
  // state enters the board — including model writes via update_taskBoard, which
  // bypass manage_tasks' crypto.randomUUID() and can collide or omit ids.
  useEffect(() => {
    let dirty = false;
    const seen = new Set<string>();
    const tasks = state.tasks.map((t) => {
      if (t.id && !seen.has(t.id)) {
        seen.add(t.id);
        return t;
      }
      dirty = true;
      const id = crypto.randomUUID();
      seen.add(id);
      return { ...t, id };
    });
    if (dirty) setState({ tasks });
  }, [state.tasks, setState]);

  const aui = useAui({ tools: Tools({ toolkit }) });

  const toggleTask = (id: string) => {
    setState((prev) => ({
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  };

  const doneCount = state.tasks.filter((t) => t.done).length;

  return (
    <AuiProvider value={aui}>
      <TaskBoardToolOverrides setState={setState} />
      <div className="bg-muted/30 flex h-full flex-col border-s">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ListTodoIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Task Board</span>
          {state.tasks.length > 0 && (
            <span className="text-muted-foreground ms-auto text-xs">
              {doneCount}/{state.tasks.length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {state.tasks.length === 0 ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center text-xs">
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
                      "hover:bg-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm transition-colors",
                      task.done && "opacity-50",
                    )}
                  >
                    {task.done ? (
                      <CheckCircle2Icon className="text-primary size-4 shrink-0" />
                    ) : (
                      <CircleIcon className="text-muted-foreground size-4 shrink-0" />
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
    </AuiProvider>
  );
};

function TaskBoardToolOverrides({
  setState,
}: {
  setState: Dispatch<SetStateAction<TaskBoardState>>;
}) {
  useAuiToolOverrides({
    manage_tasks: {
      execute: async (args) => {
        switch (args.action) {
          case "add": {
            const id = crypto.randomUUID();
            setState((prev) => ({
              tasks: [
                ...prev.tasks,
                { id, title: args.title ?? "Untitled", done: false },
              ],
            }));
            return { success: true, id };
          }
          case "toggle": {
            if (!args.id) return { success: false, error: "id is required" };
            setState((prev) => ({
              tasks: prev.tasks.map((t) =>
                t.id === args.id ? { ...t, done: !t.done } : t,
              ),
            }));
            return { success: true };
          }
          case "remove": {
            if (!args.id) return { success: false, error: "id is required" };
            setState((prev) => ({
              tasks: prev.tasks.filter((t) => t.id !== args.id),
            }));
            return { success: true };
          }
          case "clear": {
            setState({ tasks: [] });
            return { success: true };
          }
          default:
            return { success: false, error: "Unknown action" };
        }
      },
    },
  });
  return null;
}

const MiniThread: FC = () => {
  return (
    <ThreadPrimitive.Root className="bg-background flex h-full min-h-0 flex-col">
      <ThreadPrimitive.Viewport className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex grow flex-col items-center justify-center text-center">
            <p className="text-sm font-medium">Task Assistant</p>
            <p className="text-muted-foreground mt-1 text-xs">
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
      </ThreadPrimitive.Viewport>
      <div className="shrink-0 px-4 pt-2 pb-3">
        <MiniSuggestions />
        <MiniComposer />
      </div>
    </ThreadPrimitive.Root>
  );
};

const UserMsg: FC = () => (
  <MessagePrimitive.Root className="flex justify-end py-2">
    <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-3.5 py-2 text-sm">
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

const MiniMarkdownText: FC = () => (
  <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} className="aui-md" />
);

const AssistantMsg: FC = () => (
  <MessagePrimitive.Root className="py-2">
    <div className="max-w-[85%] text-sm leading-relaxed">
      <MessagePrimitive.Parts components={{ Text: MiniMarkdownText }} />
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
            className="bg-background text-muted-foreground hover:bg-muted hover:text-foreground rounded-full border px-2.5 py-1 text-xs transition-colors"
          >
            {s.label}
          </button>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
};

const MiniComposer: FC = () => (
  <ComposerPrimitive.Root className="bg-muted flex items-end gap-2 rounded-2xl border px-3 py-2">
    <ComposerPrimitive.Input
      placeholder="Add 3 tasks for a grocery run"
      className="placeholder:text-muted-foreground/60 min-h-6 flex-1 resize-none bg-transparent text-sm outline-none"
      rows={1}
      autoFocus
    />
    <AuiIf condition={(s) => !s.thread.isRunning}>
      <ComposerPrimitive.Send asChild>
        <button
          type="button"
          className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full"
        >
          <ArrowUpIcon className="size-4" />
        </button>
      </ComposerPrimitive.Send>
    </AuiIf>
    <AuiIf condition={(s) => s.thread.isRunning}>
      <ComposerPrimitive.Cancel asChild>
        <button
          type="button"
          className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full"
        >
          <Square className="size-3 fill-current" />
        </button>
      </ComposerPrimitive.Cancel>
    </AuiIf>
  </ComposerPrimitive.Root>
);

const feedbackAdapter: FeedbackAdapter = { submit: () => {} };

function InteractableRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const assistantCloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
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

export const InteractableSample = () => {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <InteractableRuntimeProvider>
        <div className="grid h-full min-h-0 grid-cols-[1fr_220px]">
          <MiniThread />
          <TaskBoard />
        </div>
      </InteractableRuntimeProvider>
    </SampleFrame>
  );
};
