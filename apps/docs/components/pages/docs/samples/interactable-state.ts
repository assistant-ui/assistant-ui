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
