"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  Interactables,
  Suggestions,
  Tools,
  useAui,
  useAuiToolOverrides,
  useAssistantInteractable,
  useInteractableState,
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
  type TaskBoardState,
  noteInitialState,
  noteSchema,
  taskBoardInitialState,
  taskBoardSchema,
} from "./state";
import toolkit from "./toolkits";

function TaskBoard() {
  const id = useAssistantInteractable("taskBoard", {
    description:
      "A task board showing the user's tasks. Use the manage_tasks tool (not update_taskBoard) to add/toggle/remove/clear tasks.",
    stateSchema: taskBoardSchema,
    initialState: taskBoardInitialState,
  });
  const [state, { setState, isPending }] = useInteractableState<TaskBoardState>(
    id,
    taskBoardInitialState,
  );

  const doneCount = state.tasks.filter((t) => t.done).length;

  return (
    <>
      <TaskBoardToolOverrides setState={setState} />
      <div className="flex flex-col">
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
              {state.tasks.map((task) => (
                <li
                  key={task.id}
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

const COLORS: Record<string, string> = {
  yellow: "bg-yellow-100 border-yellow-300",
  blue: "bg-blue-100 border-blue-300",
  green: "bg-green-100 border-green-300",
  pink: "bg-pink-100 border-pink-300",
};

function NoteCard({
  noteId,
  selectedId,
  onSelect,
  onRemove,
}: {
  noteId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  useAssistantInteractable("note", {
    id: noteId,
    description:
      "A sticky note. The AI can partially update any field (title, content, color) without resending the others.",
    stateSchema: noteSchema,
    initialState: noteInitialState,
  });
  const [state, { setState }] = useInteractableState<NoteState>(
    noteId,
    noteInitialState,
  );

  const isSelected = selectedId === noteId;

  useEffect(() => {
    if (state.selected !== isSelected) {
      setState((prev) => ({ ...prev, selected: isSelected }));
    }
  }, [isSelected, state.selected, setState]);

  const handleClick = () => {
    onSelect(noteId);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
      className={`group relative flex w-full cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 text-left transition-all ${COLORS[state.color] ?? COLORS.yellow} ${isSelected ? "ring-primary ring-2 ring-offset-1" : "hover:shadow-sm"}`}
    >
      {isSelected && (
        <span className="bg-primary text-primary-foreground absolute top-1.5 right-2 rounded px-1.5 py-0.5 text-[10px] leading-none font-medium">
          SELECTED
        </span>
      )}
      <span className="pr-16 text-sm font-semibold text-zinc-800">
        {state.title}
      </span>
      <span className="line-clamp-3 text-xs text-zinc-600">
        {state.content || "Empty note"}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(noteId);
        }}
        className="absolute right-2 bottom-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
      >
        <Trash2Icon className="size-3 text-zinc-500" />
      </button>
    </div>
  );
}

const NOTE_IDS_KEY = "interactables-example-note-ids";

function loadNoteIds(): string[] {
  try {
    const saved = localStorage.getItem(NOTE_IDS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function NotesPanel() {
  const aui = useAui();
  const [noteIds, setNoteIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const saved = loadNoteIds();
      if (saved.length > 0) setNoteIds(saved);
      return;
    }
    localStorage.setItem(NOTE_IDS_KEY, JSON.stringify(noteIds));
  }, [noteIds]);

  const handleSelect = useCallback(
    (id: string) => {
      if (selectedId && selectedId !== id) {
        aui.interactables().setState(selectedId, (prev) => ({
          ...(prev as NoteState),
          selected: false,
        }));
      }
      aui.interactables().setState(id, (prev) => ({
        ...(prev as NoteState),
        selected: true,
      }));
      setSelectedId(id);
    },
    [aui, selectedId],
  );

  const handleRemove = useCallback((id: string) => {
    setNoteIds((prev) => prev.filter((n) => n !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  return (
    <>
      <NotesToolOverrides
        setNoteIds={setNoteIds}
        setSelectedId={setSelectedId}
      />
      <div className="flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <StickyNoteIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-semibold">Notes</span>
          <span className="text-muted-foreground ml-auto text-xs">
            {noteIds.length}
          </span>
          <button
            type="button"
            onClick={() => {
              const id = `note-${crypto.randomUUID()}`;
              setNoteIds((prev) => [...prev, id]);
            }}
            className="hover:bg-muted rounded p-1 transition-colors"
          >
            <PlusIcon className="text-muted-foreground size-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {noteIds.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              No notes yet. Ask the assistant!
            </p>
          ) : (
            <div className="grid gap-2">
              {noteIds.map((noteId) => (
                <NoteCard
                  key={noteId}
                  noteId={noteId}
                  selectedId={selectedId}
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

function NotesToolOverrides({
  setNoteIds,
  setSelectedId,
}: {
  setNoteIds: Dispatch<SetStateAction<string[]>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
}) {
  useAuiToolOverrides({
    manage_notes: {
      execute: async (args) => {
        switch (args.action) {
          case "add": {
            const id = `note-${crypto.randomUUID()}`;
            setNoteIds((prev) => [...prev, id]);
            return { success: true, noteId: id };
          }
          case "remove": {
            if (args.noteId) {
              setNoteIds((prev) => prev.filter((id) => id !== args.noteId));
            }
            return { success: true };
          }
          case "clear": {
            setNoteIds([]);
            setSelectedId(null);
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

const STORAGE_KEY = "interactables-example";

function useInteractablePersistence(aui: ReturnType<typeof useAui>) {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        aui.interactables().importState(JSON.parse(saved));
      } catch {
        // ignore malformed data
      }
    }

    aui.interactables().setPersistenceAdapter({
      save: (state) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      },
    });
  }, [aui]);
}

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const aui = useAui({
    interactables: Interactables(),
    tools: Tools({ toolkit }),
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

  useInteractablePersistence(aui);

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <main className="flex h-full">
        <div className="flex-1">
          <Thread />
        </div>
        <div className="flex w-80 flex-col border-l">
          <div className="flex-1 overflow-y-auto">
            <NotesPanel />
          </div>
          <div className="flex-1 overflow-y-auto border-t">
            <TaskBoard />
          </div>
        </div>
      </main>
    </AssistantRuntimeProvider>
  );
}
