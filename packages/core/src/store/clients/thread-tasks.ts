import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type {
  ThreadMessage,
  ToolCallMessagePart,
  ToolCallMessagePartStatus,
} from "../../types/message";
import {
  COMPLETE_STATUS,
  toMessagePartStatus,
} from "../../utils/normalizePartStatus";
import type { TaskState } from "../scopes/task";

type TaskEntry = {
  readonly task: TaskState;
  readonly part: ToolCallMessagePart;
  readonly statusType: ToolCallMessagePartStatus["type"];
  readonly statusReason: string | undefined;
  readonly statusError: unknown;
  readonly messages: readonly ThreadMessage[];
};

const getStatusReason = (status: ToolCallMessagePartStatus) =>
  "reason" in status ? status.reason : undefined;

const getStatusError = (status: ToolCallMessagePartStatus) =>
  "error" in status ? status.error : undefined;

const MAX_TASK_DEPTH = 32;

const taskKeys = new WeakMap<TaskState, string>();

/** Lookup key for a task client: its document-order index path, unique by construction where ids from nested payloads are not. */
export const getTaskKey = (task: TaskState) => taskKeys.get(task) ?? task.id;

const resolveStatus = (
  message: ThreadMessage,
  partIndex: number,
  part: ToolCallMessagePart,
): ToolCallMessagePartStatus =>
  "status" in message && message.status
    ? toMessagePartStatus(message, partIndex, part)
    : COMPLETE_STATUS;

export const createTaskDeriver = () => {
  let previous: readonly TaskState[] = [];
  let previousEntries = new Map<string, TaskEntry>();

  return (messages: readonly ThreadMessage[]): readonly TaskState[] => {
    const tasks: TaskState[] = [];
    const entries = new Map<string, TaskEntry>();
    let allEntriesReused = true;

    const visit = (
      threadMessages: readonly ThreadMessage[],
      parentTaskId: string | null,
      depth: number,
      path: string,
    ) => {
      if (depth > MAX_TASK_DEPTH) return;
      for (const [messageIndex, message] of threadMessages.entries()) {
        for (const [partIndex, part] of message.content.entries()) {
          if (part.type !== "tool-call" || part.messages === undefined)
            continue;

          const nestedMessages = part.messages;
          const status = resolveStatus(message, partIndex, part);
          const statusReason = getStatusReason(status);
          const statusError = getStatusError(status);
          const entryKey = `${path}${messageIndex}.${partIndex}`;
          const previousEntry = previousEntries.get(entryKey);
          const task =
            previousEntry?.part === part &&
            previousEntry.statusType === status.type &&
            previousEntry.statusReason === statusReason &&
            Object.is(previousEntry.statusError, statusError) &&
            previousEntry.messages === nestedMessages &&
            previousEntry.task.messageId === message.id &&
            previousEntry.task.parentTaskId === parentTaskId &&
            previousEntry.task.depth === depth
              ? previousEntry.task
              : {
                  id: part.toolCallId,
                  toolName: part.toolName,
                  args: part.args,
                  result: part.result,
                  ...(part.isError === undefined
                    ? undefined
                    : { isError: part.isError }),
                  status,
                  timing: part.timing,
                  messageId: message.id,
                  parentTaskId,
                  depth,
                  messages: nestedMessages,
                };

          if (task !== previousEntry?.task) {
            allEntriesReused = false;
            taskKeys.set(task, entryKey);
          }
          tasks.push(task);
          entries.set(entryKey, {
            task,
            part,
            statusType: status.type,
            statusReason,
            statusError,
            messages: nestedMessages,
          });
          visit(nestedMessages, task.id, depth + 1, `${entryKey}.`);
        }
      }
    };

    visit(messages, null, 0, "");

    const result =
      allEntriesReused &&
      tasks.length === previous.length &&
      tasks.every((task, index) => task === previous[index])
        ? previous
        : tasks;
    previous = result;
    previousEntries = entries;
    return result;
  };
};

const useTaskClient = ({
  task,
}: {
  task: TaskState;
}): ClientOutput<"task"> => ({
  getState: () => task,
});

export const TaskClient = resource(useTaskClient);
