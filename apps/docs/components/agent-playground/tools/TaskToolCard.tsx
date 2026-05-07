import { BadgeCheck, CheckCircle2, Circle, CircleDot, ListTodo, Loader2 } from 'lucide-react';
import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import { cn } from '@/lib/utils';
import { getToolVisualStatus, ToolShell } from './ToolShell';
import { ToolPayloadRenderer } from './ToolPayloadRenderer';
import {
  taskCheckViewModel,
  taskWriteViewModel,
  type TaskItemViewModel,
  type TaskStatus,
} from './taskToolViewModel';

type TaskWriteArgs = {
  tasks?: Array<{ content?: string; status?: string; activeForm?: string }>;
};

type TaskCheckResult = {
  completed?: number | undefined;
  inProgress?: number | undefined;
  pending?: number | undefined;
  allDone?: boolean | undefined;
  incomplete?: Array<{ content?: string; status?: string; activeForm?: string }>;
};

export function TaskWriteToolView({
  args,
  result,
  isError,
  status,
}: ToolCallMessagePartProps<TaskWriteArgs, unknown>) {
  const viewModel = taskWriteViewModel(args);
  const hasResult = result !== undefined;

  return (
    <ToolShell
      title={viewModel.kind === 'tasks' ? `To-dos ${viewModel.total}` : 'To-dos'}
      icon={<ListTodo className="h-4 w-4" />}
      tone="task"
      status={getToolVisualStatus(status.type, isError, hasResult || viewModel.kind === 'tasks')}
      busy={status.type === 'running'}
    >
      {viewModel.kind === 'tasks' ? (
        <TaskListCard
          tasks={viewModel.tasks}
          completed={viewModel.completed}
          total={viewModel.total}
          emptyLabel="No todos tracked."
        />
      ) : (
        <ToolPayloadRenderer context={{ toolName: 'task_write', channel: 'args', value: args, isError }} />
      )}
      {isError ? (
        <div className="mt-3">
          <ToolPayloadRenderer context={{ toolName: 'task_write', channel: 'result', value: result, isError }} />
        </div>
      ) : null}
    </ToolShell>
  );
}

export function TaskCheckToolView({
  result,
  isError,
  status,
}: ToolCallMessagePartProps<Record<string, never>, TaskCheckResult | unknown>) {
  const viewModel = taskCheckViewModel(result);
  const hasResult = result !== undefined;

  return (
    <ToolShell
      title="Task check"
      icon={<BadgeCheck className="h-4 w-4" />}
      tone="task"
      status={getToolVisualStatus(status.type, isError, hasResult)}
      busy={status.type === 'running'}
    >
      {viewModel.kind === 'check' && !isError ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {viewModel.allDone ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <CircleDot className="h-4 w-4 text-amber-300" />
              )}
              <span>{viewModel.allDone ? 'All tasks complete' : 'Tasks still in progress'}</span>
            </div>
            <TaskProgressPill completed={viewModel.completed} total={viewModel.completed + viewModel.inProgress + viewModel.pending} />
          </div>
          {viewModel.incomplete.length > 0 ? (
            <TaskListCard
              tasks={viewModel.incomplete}
              completed={0}
              total={viewModel.incomplete.length}
              emptyLabel="No incomplete tasks."
              showProgress={false}
            />
          ) : null}
        </div>
      ) : (
        <ToolPayloadRenderer context={{ toolName: 'task_check', channel: 'result', value: result, isError }} />
      )}
    </ToolShell>
  );
}

function TaskListCard({
  tasks,
  completed,
  total,
  emptyLabel,
  showProgress = true,
}: {
  tasks: TaskItemViewModel[];
  completed: number;
  total: number;
  emptyLabel: string;
  showProgress?: boolean | undefined;
}) {
  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-2">
      {showProgress ? (
        <div className="flex items-center justify-between gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}
            />
          </div>
          <TaskProgressPill completed={completed} total={total} />
        </div>
      ) : null}
      <div className="space-y-1.5">
        {tasks.map((task, index) => (
          <TaskRow key={`${task.content}-${index}`} task={task} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskItemViewModel }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-md px-1.5 py-1 text-sm">
      <TaskStatusIcon status={task.status} />
      <span
        className={cn(
          'min-w-0 flex-1 break-words leading-5',
          task.status === 'completed' && 'text-muted-foreground line-through',
          task.status === 'pending' && 'text-muted-foreground',
          task.status === 'in_progress' && 'font-medium text-foreground',
          task.status === 'unknown' && 'text-foreground/80',
        )}
      >
        {task.displayText}
      </span>
      <StatusLabel status={task.status} />
    </div>
  );
}

function TaskStatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'completed') return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />;
  if (status === 'in_progress') return <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-300" />;
  if (status === 'pending') return <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
  return <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
}

function StatusLabel({ status }: { status: TaskStatus }) {
  const label = status === 'in_progress' ? 'in progress' : status;
  return (
    <span className="hidden shrink-0 rounded bg-muted/70 px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground sm:inline">
      {label}
    </span>
  );
}

function TaskProgressPill({ completed, total }: { completed: number; total: number }) {
  return (
    <span className="shrink-0 rounded bg-muted/70 px-2 py-0.5 text-xs text-muted-foreground">
      {completed}/{total} done
    </span>
  );
}
