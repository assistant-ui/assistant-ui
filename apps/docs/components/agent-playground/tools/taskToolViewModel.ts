export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'unknown';

export type TaskItemViewModel = {
  content: string;
  displayText: string;
  status: TaskStatus;
  activeForm?: string | undefined;
};

export type TaskWriteViewModel =
  | {
      kind: 'tasks';
      tasks: TaskItemViewModel[];
      total: number;
      completed: number;
      inProgress: number;
      pending: number;
      unknown: number;
    }
  | {
      kind: 'unknown';
    };

export type TaskCheckViewModel =
  | {
      kind: 'check';
      completed: number;
      inProgress: number;
      pending: number;
      allDone: boolean;
      incomplete: TaskItemViewModel[];
    }
  | {
      kind: 'unknown';
    };

const TASK_STATUSES = new Set(['pending', 'in_progress', 'completed']);

export function taskWriteViewModel(args: unknown): TaskWriteViewModel {
  const record = asRecord(args);
  const rawTasks = Array.isArray(record?.tasks) ? record.tasks : null;
  if (!rawTasks) return { kind: 'unknown' };

  const tasks = rawTasks.map(normalizeTaskItem).filter((task): task is TaskItemViewModel => task !== null);
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  const pending = tasks.filter((task) => task.status === 'pending').length;
  const unknown = tasks.filter((task) => task.status === 'unknown').length;

  return {
    kind: 'tasks',
    tasks,
    total: tasks.length,
    completed,
    inProgress,
    pending,
    unknown,
  };
}

export function taskCheckViewModel(result: unknown): TaskCheckViewModel {
  const record = asRecord(result);
  if (!record) return { kind: 'unknown' };
  const hasKnownField = ['completed', 'inProgress', 'pending', 'allDone', 'incomplete'].some((key) => key in record);
  if (!hasKnownField) return { kind: 'unknown' };

  const incomplete = Array.isArray(record.incomplete)
    ? record.incomplete.map(normalizeTaskItem).filter((task): task is TaskItemViewModel => task !== null)
    : [];

  return {
    kind: 'check',
    completed: numberFromUnknown(record.completed),
    inProgress: numberFromUnknown(record.inProgress),
    pending: numberFromUnknown(record.pending),
    allDone: Boolean(record.allDone),
    incomplete,
  };
}

function normalizeTaskItem(value: unknown): TaskItemViewModel | null {
  const record = asRecord(value);
  if (!record) return null;
  const content = stringFromUnknown(record.content);
  const activeForm = stringFromUnknown(record.activeForm);
  if (!content && !activeForm) return null;
  const status = normalizeStatus(record.status);
  return {
    content: content || activeForm,
    displayText: status === 'in_progress' && activeForm ? activeForm : content || activeForm,
    status,
    ...(activeForm ? { activeForm } : {}),
  };
}

function normalizeStatus(value: unknown): TaskStatus {
  if (typeof value !== 'string') return 'unknown';
  return TASK_STATUSES.has(value) ? (value as TaskStatus) : 'unknown';
}

function numberFromUnknown(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function stringFromUnknown(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}
