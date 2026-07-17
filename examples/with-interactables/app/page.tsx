"use client";

import { useCallback } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  AuiProvider,
  unstable_Interactables,
  Suggestions,
  useAui,
  unstable_useInteractable,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import {
  CheckCircle2Icon,
  CircleIcon,
  ListTodoIcon,
  Loader2Icon,
  StickyNoteIcon,
  Trash2Icon,
  PlusIcon,
} from "lucide-react";
import {
  type NoteState,
  noteInitialState,
  notesInitialState,
  notesSchema,
  taskBoardInitialState,
  taskBoardSchema,
} from "./state";

function TaskBoard() {
  const [state, { setState, isPending }] = unstable_useInteractable(
    "taskBoard",
    {
      description:
        "A task board showing the user's tasks. Use update_taskBoard with tasks.add/update/remove/clear to manage tasks. New tasks need a title and done=false.",
      stateSchema: taskBoardSchema,
      initialState: taskBoardInitialState,
    },
  );

  const doneCount = state.tasks.filter((t) => t.done).length;

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ListTodoIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-semibold">Task Board</span>
          {isPending && (
            <Loader2Icon className="text-muted-foreground size-3 animate-spin" />
          )}
          {state.tasks.length > 0 && (
            <span className="bg-primary/10 text-primary ml-auto rounded-full px-2 py-0.5 text-xs font-medium">
              {doneCount}/{state.tasks.length}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {state.tasks.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              No tasks yet. Ask the assistant!
            </p>
          ) : (
            <ul className="space-y-1">
              {state.tasks.map((task, index) => (
                <li
                  key={task.id ?? `streaming-${index}`}
                  className="group hover:bg-muted flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        tasks: prev.tasks.map((t) =>
                          t.id === task.id ? { ...t, done: !t.done } : t,
                        ),
                      }))
                    }
                    className="shrink-0"
                    aria-label={
                      task.done ? "Mark task undone" : "Mark task done"
                    }
                  >
                    {task.done ? (
                      <CheckCircle2Icon className="text-primary size-4" />
                    ) : (
                      <CircleIcon className="text-muted-foreground size-4" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${task.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {task.title}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        tasks: prev.tasks.filter((t) => t.id !== task.id),
                      }))
                    }
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Remove task ${task.title}`}
                  >
                    <Trash2Icon className="text-muted-foreground hover:text-destructive size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

const COLORS: Record<NoteState["color"], string> = {
  yellow: "bg-yellow-100 border-yellow-300",
  blue: "bg-blue-100 border-blue-300",
  green: "bg-green-100 border-green-300",
  pink: "bg-pink-100 border-pink-300",
};

function NoteCard({
  note,
  selected,
  onSelect,
  onRemove,
}: {
  note: NoteState;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect(note.id)}
        className={`flex w-full cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 text-left transition-all ${COLORS[note.color] ?? COLORS.yellow} ${selected ? "ring-primary ring-2 ring-offset-1" : "hover:shadow-sm"}`}
        aria-pressed={selected}
      >
        {selected && (
          <span className="bg-primary text-primary-foreground absolute top-1.5 right-2 rounded px-1.5 py-0.5 text-[10px] leading-none font-medium">
            SELECTED
          </span>
        )}
        <span className="pr-16 text-sm font-semibold text-zinc-800">
          {note.title}
        </span>
        <span className="line-clamp-3 text-xs text-zinc-600">
          {note.content || "Empty note"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(note.id)}
        className="absolute right-2 bottom-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
        aria-label={`Remove note ${note.title}`}
      >
        <Trash2Icon className="size-3 text-zinc-500" />
      </button>
    </div>
  );
}

function NotesPanel() {
  const [state, { setState }] = unstable_useInteractable("notes", {
    description:
      "The sticky-note collection and selected note id. Use update_notes with notes.add/update/remove/clear to manage notes, and set selectedId to change focus. New notes need a title, content, and color.",
    stateSchema: notesSchema,
    initialState: notesInitialState,
  });

  const handleAdd = useCallback(() => {
    const id = `note-${crypto.randomUUID()}`;
    setState((prev) => ({
      notes: [...prev.notes, { id, ...noteInitialState }],
      selectedId: id,
    }));
  }, [setState]);

  const handleSelect = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, selectedId: id }));
    },
    [setState],
  );

  const handleRemove = useCallback(
    (id: string) => {
      setState((prev) => ({
        notes: prev.notes.filter((note) => note.id !== id),
        selectedId: prev.selectedId === id ? null : prev.selectedId,
      }));
    },
    [setState],
  );

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <StickyNoteIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-semibold">Notes</span>
          <span className="text-muted-foreground ml-auto text-xs">
            {state.notes.length}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            className="hover:bg-muted rounded p-1 transition-colors"
            aria-label="Add note"
          >
            <PlusIcon className="text-muted-foreground size-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {state.notes.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              No notes yet. Ask the assistant!
            </p>
          ) : (
            <div className="grid gap-2">
              {state.notes.map((note, index) => (
                <NoteCard
                  key={note.id ?? `streaming-${index}`}
                  note={note}
                  selected={state.selectedId === note.id}
                  onSelect={handleSelect}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const STORAGE_KEY = "interactables-example";

// Module-level so the adapter identity is stable across renders.
const persistenceAdapter = {
  load: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  },
  save: (state: unknown) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};

function InteractablesExample() {
  const aui = useAui({
    unstable_interactables: unstable_Interactables({
      persistence: persistenceAdapter,
    }),
    suggestions: Suggestions([
      {
        title: "Add 3 tasks",
        label: "for a grocery run",
        prompt: "Add 3 tasks for a grocery run",
      },
      {
        title: "Create 2 notes",
        label: "and set different colors",
        prompt:
          "Create 2 sticky notes: one blue note about meeting prep, and one green note about project ideas",
      },
      {
        title: "Change selected note",
        label: "to pink color",
        prompt: "Change the selected note's color to pink",
      },
    ]),
  });

  return (
    <AuiProvider value={aui}>
      <main className="flex h-full min-h-0">
        <div className="min-w-0 flex-1">
          <Thread />
        </div>
        <div className="flex w-80 flex-col border-l">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NotesPanel />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t">
            <TaskBoard />
          </div>
        </div>
      </main>
    </AuiProvider>
  );
}

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <InteractablesExample />
    </AssistantRuntimeProvider>
  );
}
