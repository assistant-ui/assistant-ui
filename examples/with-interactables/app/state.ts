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

export const manageTasksParameters = z.object({
  action: z.enum(["add", "toggle", "remove", "clear"]),
  title: z.string().optional(),
  id: z.string().optional(),
});

export type ManageTasksArgs = z.infer<typeof manageTasksParameters>;

export const noteSchema = z.object({
  title: z.string(),
  content: z.string(),
  color: z.enum(["yellow", "blue", "green", "pink"]),
  selected: z.boolean(),
});

export type NoteState = z.infer<typeof noteSchema>;

export const noteInitialState: NoteState = {
  title: "New Note",
  content: "",
  color: "yellow",
  selected: false,
};

export const manageNotesParameters = z.object({
  action: z.enum(["add", "remove", "clear"]),
  noteId: z.string().optional(),
});

export type ManageNotesArgs = z.infer<typeof manageNotesParameters>;
