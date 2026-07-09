import { z } from "zod";

export type Task = { id: string; title: string; done: boolean };
export type TaskBoardState = { tasks: Task[] };

export const taskBoardSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().describe("Stable task id, unique within this board."),
      title: z.string(),
      done: z.boolean(),
    }),
  ),
});

export const taskBoardInitialState: TaskBoardState = { tasks: [] };

export const noteColorSchema = z.enum(["yellow", "blue", "green", "pink"]);

export const noteSchema = z.object({
  id: z.string().describe("Stable note id, unique within this collection."),
  title: z.string(),
  content: z.string(),
  color: noteColorSchema,
});

export type NoteState = z.infer<typeof noteSchema>;

export const noteInitialState: Omit<NoteState, "id"> = {
  title: "New Note",
  content: "",
  color: "yellow",
};

export const notesSchema = z.object({
  notes: z.array(noteSchema),
  selectedId: z.string().nullable(),
});

export type NotesState = z.infer<typeof notesSchema>;

export const notesInitialState: NotesState = {
  notes: [],
  selectedId: null,
};
