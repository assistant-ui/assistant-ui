import {
  mono,
  monoStyle,
  textButtonHitSlop,
} from "@/components/assistant-ui/elements/surfaces";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useAuiState, type TaskState } from "@assistant-ui/react-native";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react-native";
import { type FC, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AgentStatus as AgentStatusBase,
  type AgentState,
} from "./agent-status";
import { TaskStateIcon } from "./task-card";
import {
  formatElapsed,
  TASK_PAGE_SIZE,
  taskLabel,
  taskMeta,
  taskStateOf,
  useTaskElapsed,
} from "../utils/task";

export type TaskSummary = {
  readonly total: number;
  readonly running: number;
  readonly waiting: number;
  readonly failed: number;
  readonly startedAt: number | undefined;
  readonly runningLabel: string | undefined;
};

const summarize = (tasks: readonly TaskState[]): TaskSummary => {
  let running = 0;
  let waiting = 0;
  let failed = 0;
  let startedAt: number | undefined;
  let runningLabel: string | undefined;
  for (const task of tasks) {
    const state = taskStateOf(task.status, task.isError);
    if (state === "working") {
      running += 1;
      runningLabel ??= taskLabel(task.toolName, task.args);
      const taskStartedAt = task.timing?.startedAt;
      if (
        taskStartedAt !== undefined &&
        (startedAt === undefined || taskStartedAt < startedAt)
      ) {
        startedAt = taskStartedAt;
      }
    } else if (state === "waiting") {
      waiting += 1;
    } else if (state === "failed") {
      failed += 1;
    }
  }
  return {
    total: tasks.length,
    running,
    waiting,
    failed,
    startedAt,
    runningLabel,
  };
};

export const useTaskSummary = (): TaskSummary => {
  const tasks = useAuiState((s) => s.thread.tasks);
  return useMemo(() => summarize(tasks), [tasks]);
};

const plural = (count: number, noun: string) =>
  `${count} ${count === 1 ? noun : `${noun}s`}`;

export const summaryState = (summary: TaskSummary): AgentState => {
  if (summary.running > 0) return "working";
  if (summary.waiting > 0) return "waiting";
  return summary.failed > 0 ? "failed" : "done";
};

export const summaryLabel = (summary: TaskSummary) => {
  if (summary.running === 1 && summary.runningLabel !== undefined) {
    return summary.runningLabel;
  }
  if (summary.running > 0) {
    return `${summary.running} of ${plural(summary.total, "task")} running`;
  }
  if (summary.waiting > 0) {
    return `${plural(summary.waiting, "task")} waiting for input`;
  }
  if (summary.failed > 0) {
    return `${plural(summary.total, "task")} done, ${summary.failed} failed`;
  }
  return `${plural(summary.total, "task")} done`;
};

export const AgentStatus: FC<{ className?: string }> = ({ className }) => {
  const summary = useTaskSummary();
  const elapsedMs = useTaskElapsed(
    summary.startedAt === undefined
      ? undefined
      : { startedAt: summary.startedAt },
    summary.running > 0,
  );
  if (summary.running === 0 && summary.waiting === 0) return null;

  return (
    <AgentStatusBase
      className={className}
      state={summaryState(summary)}
      label={summaryLabel(summary)}
      elapsed={elapsedMs === undefined ? undefined : formatElapsed(elapsedMs)}
    />
  );
};

const TaskTrayItem: FC<{ task: TaskState }> = ({ task }) => {
  const state = taskStateOf(task.status, task.isError);
  const label = taskLabel(task.toolName, task.args);
  const meta = taskMeta(task.args);
  const elapsedMs = useTaskElapsed(
    task.timing,
    task.status.type === "running" || task.status.type === "requires-action",
  );

  return (
    <View
      className="aui-task-tray-item flex-row items-center gap-2.5 rounded-lg py-2 pe-2.5"
      style={{ paddingStart: 10 + task.depth * 12 }}
      accessible
      accessibilityLabel={`${label}, ${state}`}
    >
      <TaskStateIcon state={state} />
      <Text
        className="text-foreground min-w-0 flex-1 text-[13px]"
        numberOfLines={1}
      >
        {label}
      </Text>
      {meta !== undefined && (
        <Text
          className={cn(mono, "text-foreground/35 max-w-24 shrink-0")}
          style={monoStyle}
          numberOfLines={1}
        >
          {meta}
        </Text>
      )}
      {elapsedMs !== undefined && (
        <Text
          className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}
          style={monoStyle}
        >
          {formatElapsed(elapsedMs)}
        </Text>
      )}
    </View>
  );
};

export const TaskTray: FC<{ className?: string }> = ({ className }) => {
  const tasks = useAuiState((s) => s.thread.tasks);
  const summary = useMemo(() => summarize(tasks), [tasks]);
  const elapsedMs = useTaskElapsed(
    summary.startedAt === undefined
      ? undefined
      : { startedAt: summary.startedAt },
    summary.running > 0,
  );
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(TASK_PAGE_SIZE);
  const firstTask = tasks[0];
  const listKey =
    firstTask === undefined ? "" : `${firstTask.messageId}:${firstTask.id}`;
  const [seenListKey, setSeenListKey] = useState(listKey);
  if (seenListKey !== listKey) {
    setSeenListKey(listKey);
    setVisible(TASK_PAGE_SIZE);
  }
  if (summary.total === 0 && open) setOpen(false);
  if (summary.total === 0) return null;
  const hidden = Math.max(0, tasks.length - visible);
  const close = () => {
    setOpen(false);
    setVisible(TASK_PAGE_SIZE);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${summaryLabel(summary)}, ${summaryState(summary)}`}
        accessibilityHint="Shows every task in the thread"
        aria-expanded={open}
        onPress={() => setOpen(true)}
        className={cn(
          "aui-task-tray-trigger self-start rounded-full",
          className,
        )}
      >
        <AgentStatusBase
          accessible={false}
          state={summaryState(summary)}
          label={summaryLabel(summary)}
          elapsed={
            elapsedMs === undefined ? undefined : formatElapsed(elapsedMs)
          }
          trailing={
            <Icon
              as={open ? ChevronUpIcon : ChevronDownIcon}
              className="text-muted-foreground size-3"
            />
          }
        />
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable
          className="aui-task-tray-backdrop flex-1 justify-end bg-black/40"
          accessibilityLabel="Close tasks"
          onPress={close}
        >
          <View
            className="aui-task-tray bg-background rounded-t-2xl px-2 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              className="text-muted-foreground px-2.5 pb-1 text-xs"
              accessibilityRole="header"
            >
              Tasks
            </Text>
            <ScrollView className="max-h-80" nestedScrollEnabled>
              {tasks.slice(0, visible).map((task, index) => (
                <TaskTrayItem key={`${index}:${task.id}`} task={task} />
              ))}
              {hidden > 0 && (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={textButtonHitSlop}
                  onPress={() => setVisible((count) => count + TASK_PAGE_SIZE)}
                  className="aui-task-tray-more self-start px-2.5 py-2"
                >
                  <Text className="text-muted-foreground text-xs">
                    Show {Math.min(hidden, TASK_PAGE_SIZE)} more
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};
