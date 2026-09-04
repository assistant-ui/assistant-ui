type Task = {
  id: number;
  title: string;
  done: boolean;
};

let nextId = 4;
let tasks: readonly Task[] = [
  { id: 1, title: "Ship the release notes", done: false },
  { id: 2, title: "Review the onboarding PR", done: true },
  { id: 3, title: "Book the offsite venue", done: false },
];

const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const taskStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => tasks,
  add: (title: string): Task => {
    const task = { id: nextId++, title, done: false };
    tasks = [...tasks, task];
    notify();
    return task;
  },
  setDone: (id: number, done: boolean): void => {
    tasks = tasks.map((t) => (t.id === id ? { ...t, done } : t));
    notify();
  },
  clearCompleted: (): number => {
    const removed = tasks.filter((t) => t.done).length;
    tasks = tasks.filter((t) => !t.done);
    notify();
    return removed;
  },
};
