"use client";

import {
  MessagePrimitive,
  ReadonlyThreadProvider,
  ThreadPrimitive,
  useAuiState,
  type ThreadMessage,
  type ToolCallMessagePart,
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartStatus,
} from "@assistant-ui/react";
import { type FC, useState } from "react";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import {
  formatUnknownValue,
  ToolFallback,
} from "@/components/assistant-ui/elements/tool-fallback.aui";
import { cn } from "@/lib/utils";
import { mono } from "./surfaces";
import { TaskCard as TaskCardBase } from "./task-card";
import {
  formatElapsed,
  TASK_PAGE_SIZE,
  taskLabel,
  taskMeta,
  taskStateOf,
  useTaskElapsed,
} from "../utils/task";

export type { TaskCardState } from "./task-card";
export { TASK_PAGE_SIZE } from "../utils/task";

export type TaskPart = ToolCallMessagePart & {
  readonly status: ToolCallMessagePartStatus;
};

export const isTaskPart = (part: {
  readonly type: string;
  readonly messages?: unknown;
}) => part.type === "tool-call" && part.messages !== undefined;

const ROLE_LABELS = {
  user: "instruction",
  assistant: "agent",
  system: "system",
} as const;

const NestedToolCall: ToolCallMessagePartComponent = (props) =>
  isTaskPart(props) ? <TaskCard part={props} /> : <ToolFallback {...props} />;

const NestedMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);

  return (
    <MessagePrimitive.Root
      data-slot="aui_task-transcript-message"
      data-role={role}
      className="flex flex-col gap-1 text-xs leading-relaxed"
    >
      <span className={cn(mono, "text-foreground/35")}>
        {ROLE_LABELS[role]}
      </span>
      <MessagePrimitive.Parts
        components={{ Text: MarkdownText, tools: { Fallback: NestedToolCall } }}
      />
    </MessagePrimitive.Root>
  );
};

const TaskTranscript: FC<{ messages: readonly ThreadMessage[] }> = ({
  messages,
}) => (
  <ReadonlyThreadProvider messages={messages}>
    <ThreadPrimitive.Messages>
      {() => <NestedMessage />}
    </ThreadPrimitive.Messages>
  </ReadonlyThreadProvider>
);

const TaskResult: FC<{ result: unknown }> = ({ result }) =>
  typeof result === "string" ? (
    <p className="m-0 whitespace-pre-wrap">{result}</p>
  ) : (
    <pre className="m-0 overflow-x-auto whitespace-pre-wrap">
      {formatUnknownValue(result, 2)}
    </pre>
  );

export const TaskCard: FC<{ part: TaskPart; className?: string }> = ({
  part,
  className,
}) => {
  const elapsedMs = useTaskElapsed(part.timing, part.status.type === "running");
  const messages = part.messages ?? [];

  return (
    <TaskCardBase
      className={className}
      label={taskLabel(part.toolName, part.args)}
      meta={taskMeta(part.args)}
      state={taskStateOf(part.status, part.isError)}
      elapsed={elapsedMs === undefined ? undefined : formatElapsed(elapsedMs)}
      result={
        part.result === undefined ? undefined : (
          <TaskResult result={part.result} />
        )
      }
    >
      {messages.length > 0 ? <TaskTranscript messages={messages} /> : undefined}
    </TaskCardBase>
  );
};

const TaskLane: FC<{ index: number }> = ({ index }) => {
  const part = useAuiState((s) => s.message.parts[index]);
  if (part?.type !== "tool-call") return null;
  return <TaskCard part={part} />;
};

export const TaskGroup: FC<{
  group: MessagePrimitive.GroupedParts.GroupPart;
  className?: string;
}> = ({ group, className }) => {
  const [visible, setVisible] = useState(TASK_PAGE_SIZE);
  const { indices, counts } = group;
  const failed = useAuiState((s) =>
    indices.reduce((count, index) => {
      const part = s.message.parts[index];
      return part?.type === "tool-call" &&
        taskStateOf(part.status, part.isError) === "failed"
        ? count + 1
        : count;
    }, 0),
  );
  if (indices.length === 1) return <TaskLane index={indices[0]!} />;

  const shown = indices.slice(0, visible);
  const hidden = indices.length - shown.length;
  const summary = [
    `${indices.length} tasks`,
    counts.running > 0 && `${counts.running} running`,
    counts.requiresAction > 0 && `${counts.requiresAction} waiting`,
    failed > 0 && `${failed} failed`,
  ].filter((entry): entry is string => typeof entry === "string");

  return (
    <div
      data-slot="aui_task-group"
      className={cn("flex w-full max-w-sm flex-col gap-2", className)}
    >
      <div
        data-slot="aui_task-group-summary"
        className="text-muted-foreground px-1 text-xs"
      >
        {summary.join(" · ")}
      </div>
      {shown.map((index) => (
        <TaskLane key={index} index={index} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          data-slot="aui_task-group-more"
          onClick={() => setVisible((count) => count + TASK_PAGE_SIZE)}
          className="text-muted-foreground hover:text-foreground w-fit px-1 text-xs transition-colors"
        >
          Show {Math.min(hidden, TASK_PAGE_SIZE)} more
        </button>
      )}
    </div>
  );
};
