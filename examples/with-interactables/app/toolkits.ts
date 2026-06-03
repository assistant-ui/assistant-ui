"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useMemo } from "react";
import type { Toolkit } from "@assistant-ui/react";
import { z } from "zod";

export type Task = { id: string; title: string; done: boolean };
export type TaskBoardState = { tasks: Task[] };

export const taskBoardSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      done: z.boolean(),
    }),
  ),
});

export const taskBoardInitialState: TaskBoardState = { tasks: [] };

let nextTaskId = 0;

type TaskBoardSetterRef = MutableRefObject<
  Dispatch<SetStateAction<TaskBoardState>>
>;

export function useTaskBoardToolkit(setStateRef: TaskBoardSetterRef) {
  return useMemo(
    () =>
      ({
        manage_tasks: {
          type: "frontend",
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
                if (!args.id)
                  return { success: false, error: "id is required" };
                set((prev) => ({
                  tasks: prev.tasks.map((t) =>
                    t.id === args.id ? { ...t, done: !t.done } : t,
                  ),
                }));
                return { success: true };
              }
              case "remove": {
                if (!args.id)
                  return { success: false, error: "id is required" };
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
          renderText: {
            running: ({ args }) => `Updating tasks: ${args.action}`,
            complete: ({ result }) =>
              result?.success ? "Tasks updated" : result?.error,
          },
        },
      }) satisfies Toolkit,
    [setStateRef],
  );
}

export type NoteState = { title: string; content: string; color: string };

export const noteSchema = z.object({
  title: z.string(),
  content: z.string(),
  color: z.enum(["yellow", "blue", "green", "pink"]),
});

export const noteInitialState: NoteState = {
  title: "New Note",
  content: "",
  color: "yellow",
};

type NoteIdsSetterRef = MutableRefObject<Dispatch<SetStateAction<string[]>>>;
type SelectedIdSetterRef = MutableRefObject<
  Dispatch<SetStateAction<string | null>>
>;

export function useNotesToolkit(
  setNoteIdsRef: NoteIdsSetterRef,
  setSelectedIdRef: SelectedIdSetterRef,
) {
  return useMemo(
    () =>
      ({
        manage_notes: {
          type: "frontend",
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
          renderText: {
            running: ({ args }) => `Updating notes: ${args.action}`,
            complete: ({ result }) =>
              result?.success ? "Notes updated" : result?.error,
          },
        },
      }) satisfies Toolkit,
    [setNoteIdsRef, setSelectedIdRef],
  );
}
