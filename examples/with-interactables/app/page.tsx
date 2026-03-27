"use client";

import { useRef, useState, useCallback } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  Interactables,
  Suggestions,
  useAui,
  useAssistantInteractable,
  useInteractableState,
  useAssistantTool,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { z } from "zod";
import {
  CheckCircle2Icon,
  CircleIcon,
  ListTodoIcon,
  StickyNoteIcon,
  Trash2Icon,
  PlusIcon,
} from "lucide-react";

// ===========================================================================
// 1. Task Board — single-instance interactable + custom tool
// ===========================================================================

type Task = { id: string; title: string; done: boolean };
type TaskBoardState = { tasks: Task[] };

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

let nextTaskId = 0;

function TaskBoard() {
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

  const doneCount = state.tasks.filter((t) => t.done).length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ListTodoIcon className="size-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Task Board</span>
        {state.tasks.length > 0 && (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
            {doneCount}/{state.tasks.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {state.tasks.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-xs">
            No tasks yet. Ask the assistant!
          </p>
        ) : (
          <ul className="space-y-1">
            {state.tasks.map((task) => (
              <li
                key={task.id}
                className="group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
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
                    <CheckCircle2Icon className="size-4 text-primary" />
                  ) : (
                    <CircleIcon className="size-4 text-muted-foreground" />
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
                  <Trash2Icon className="size-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// 2. Sticky Notes — multi-instance interactable + selection + partial updates
// ===========================================================================

type NoteState = { title: string; content: string; color: string };

const noteSchema = z.object({
  title: z.string(),
  content: z.string(),
  color: z.enum(["yellow", "blue", "green", "pink"]),
});

const noteInitialState: NoteState = {
  title: "New Note",
  content: "",
  color: "yellow",
};

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
  // Multi-instance: each NoteCard has a unique `id`, all share name "note"
  // Partial updates: AI can send { color: "blue" } without resending title/content
  // Selection: clicking a note calls setSelected(true)
  useAssistantInteractable("note", {
    id: noteId,
    description:
      "A sticky note. The AI can partially update any field (title, content, color) without resending the others.",
    stateSchema: noteSchema,
    initialState: noteInitialState,
    selected: selectedId === noteId,
  });
  const [state, { setSelected }] = useInteractableState<NoteState>(
    noteId,
    noteInitialState,
  );

  const isSelected = selectedId === noteId;

  const handleClick = () => {
    onSelect(noteId);
    setSelected(true);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
      className={`group relative flex w-full cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 text-left transition-all ${COLORS[state.color] ?? COLORS.yellow} ${isSelected ? "ring-2 ring-primary ring-offset-1" : "hover:shadow-sm"}`}
    >
      {isSelected && (
        <span className="absolute top-1.5 right-2 rounded bg-primary px-1.5 py-0.5 font-medium text-[10px] text-primary-foreground leading-none">
          SELECTED
        </span>
      )}
      <span className="pr-16 font-semibold text-sm text-zinc-800">
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
        className="absolute right-2 bottom-2 rounded p-0.5 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100"
      >
        <Trash2Icon className="size-3 text-zinc-500" />
      </button>
    </div>
  );
}

function NotesPanel() {
  const [noteIds, setNoteIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const noteIdsRef = useRef(noteIds);
  noteIdsRef.current = noteIds;
  const setNoteIdsRef = useRef(setNoteIds);
  setNoteIdsRef.current = setNoteIds;
  const setSelectedIdRef = useRef(setSelectedId);
  setSelectedIdRef.current = setSelectedId;

  // Tool to add/remove notes (manages the list, not the note content)
  useAssistantTool({
    toolName: "manage_notes",
    description:
      'Manage sticky notes. Actions: "add" (creates a new note, returns its id), "remove" (requires noteId), "clear" (removes all notes). After adding, use the update_note_{id} tool to set its content.',
    parameters: z.object({
      action: z.enum(["add", "remove", "clear"]),
      noteId: z.string().optional(),
    }),
    execute: async (args) => {
      switch (args.action) {
        case "add": {
          const id = `note-${Date.now().toString(36)}`;
          setNoteIdsRef.current((prev) => [...prev, id]);
          return { success: true, noteId: id };
        }
        case "remove": {
          if (args.noteId) {
            setNoteIdsRef.current((prev) =>
              prev.filter((id) => id !== args.noteId),
            );
          }
          return { success: true };
        }
        case "clear": {
          setNoteIdsRef.current([]);
          setSelectedIdRef.current(null);
          return { success: true };
        }
        default:
          return { success: false, error: "Unknown action" };
      }
    },
  });

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setNoteIds((prev) => prev.filter((n) => n !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <StickyNoteIcon className="size-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Notes</span>
        <span className="ml-auto text-muted-foreground text-xs">
          {noteIds.length}
        </span>
        <button
          type="button"
          onClick={() => {
            const id = `note-${Date.now().toString(36)}`;
            setNoteIds((prev) => [...prev, id]);
          }}
          className="rounded p-1 transition-colors hover:bg-muted"
        >
          <PlusIcon className="size-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {noteIds.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-xs">
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
  );
}

// ===========================================================================
// App
// ===========================================================================

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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
