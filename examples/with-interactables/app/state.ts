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

export const manageTasksParameters = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    title: z.string(),
  }),
  z.object({
    action: z.literal("toggle"),
    id: z.string(),
  }),
  z.object({
    action: z.literal("remove"),
    id: z.string(),
  }),
  z.object({
    action: z.literal("clear"),
  }),
]);

export type ManageTasksArgs = z.infer<typeof manageTasksParameters>;

export const noteColorSchema = z.enum(["yellow", "blue", "green", "pink"]);

export const noteSchema = z.object({
  title: z.string(),
  content: z.string(),
  color: noteColorSchema,
  selected: z.boolean(),
});

export type NoteState = z.infer<typeof noteSchema>;

export const noteInitialState: NoteState = {
  title: "New Note",
  content: "",
  color: "yellow",
  selected: false,
};

export const notesIndexSchema = z.object({
  ids: z.array(z.string()),
  selectedId: z.string().nullable(),
});

export type NotesIndexState = z.infer<typeof notesIndexSchema>;

export const notesIndexInitialState: NotesIndexState = {
  ids: [],
  selectedId: null,
};

export const manageNotesParameters = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    title: z.string().optional(),
    content: z.string().optional(),
    color: noteColorSchema.optional(),
    select: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("select"),
    noteId: z.string(),
  }),
  z.object({
    action: z.literal("remove"),
    noteId: z.string(),
  }),
  z.object({
    action: z.literal("clear"),
  }),
]);

export type ManageNotesArgs = z.infer<typeof manageNotesParameters>;
