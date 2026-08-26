export type Task = {
  id: string;
  title: string;
  done: boolean;
};

let tasks: readonly Task[] = [
  {
    id: "task-1",
    title: "Enable chrome://flags/#enable-webmcp-testing",
    done: false,
  },
  { id: "task-2", title: "Open the Model Context Tool Inspector", done: false },
  { id: "task-3", title: "Ask an agent to manage this board", done: false },
];
let nextId = 4;

const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export const taskStore = {
  getSnapshot: (): readonly Task[] => tasks,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  addTask: (title: string): Task => {
    const task: Task = { id: `task-${nextId++}`, title, done: false };
    tasks = [...tasks, task];
    emit();
    return task;
  },
  setTaskDone: (id: string, done: boolean): Task | undefined => {
    const existing = tasks.find((task) => task.id === id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, done };
    tasks = tasks.map((task) => (task.id === id ? updated : task));
    emit();
    return updated;
  },
  removeTask: (id: string): Task | undefined => {
    const existing = tasks.find((task) => task.id === id);
    if (!existing) return undefined;
    tasks = tasks.filter((task) => task.id !== id);
    emit();
    return existing;
  },
};
