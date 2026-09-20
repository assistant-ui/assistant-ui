import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import {
  mono,
  monoStyle,
  textButtonHitSlop,
} from "@/components/assistant-ui/elements/surfaces";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback";
import { cn } from "@/lib/utils";
import {
  MessageByIndexProvider,
  MessagePrimitive,
  ReadonlyThreadProvider,
  unstable_useThreadMessageIds,
  useAuiState,
  type ThreadMessage,
  type ToolCallMessagePart,
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartStatus,
} from "@assistant-ui/react-native";
import { type FC, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TaskCard as TaskCardBase } from "./task-card";
import {
  formatElapsed,
  formatUnknownValue,
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

const KEY_SEPARATOR = String.fromCharCode(31);

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
    <MessagePrimitive.Root className="aui-task-transcript-message gap-1">
      <Text className={cn(mono, "text-foreground/35")} style={monoStyle}>
        {ROLE_LABELS[role]}
      </Text>
      <MessagePrimitive.Parts
        components={{ Text: MarkdownText, tools: { Fallback: NestedToolCall } }}
      />
    </MessagePrimitive.Root>
  );
};

// The transcript sits inside a list row, so it maps the nested messages in a
// plain view instead of nesting a second virtualized list. The ids come from
// the readonly thread rather than the prop, because the provider syncs a new
// prop into its core after the render that carries it.
const NestedMessages: FC = () => {
  const messageIds = unstable_useThreadMessageIds();
  return messageIds.map((messageId, index) => (
    <MessageByIndexProvider key={messageId} index={index}>
      <NestedMessage />
    </MessageByIndexProvider>
  ));
};

const TaskTranscript: FC<{ messages: readonly ThreadMessage[] }> = ({
  messages,
}) => (
  <ReadonlyThreadProvider messages={messages}>
    <NestedMessages />
  </ReadonlyThreadProvider>
);

const resultTextClassName = "text-foreground/70 text-xs leading-relaxed";

const TaskResult: FC<{ result: unknown }> = ({ result }) =>
  typeof result === "string" ? (
    <Text
      className={cn("aui-task-card-result-text", resultTextClassName)}
      selectable
    >
      {result}
    </Text>
  ) : (
    <Text
      className={cn("aui-task-card-result-json", resultTextClassName)}
      style={monoStyle}
      selectable
    >
      {formatUnknownValue(result, 2)}
    </Text>
  );

const TaskError: FC<{ status: ToolCallMessagePartStatus }> = ({ status }) => {
  if (status.type !== "incomplete") return null;
  const error = status.error;
  const errorText =
    error === undefined || error === null ? null : formatUnknownValue(error);
  if (!errorText) return null;

  return (
    <View className="aui-task-card-error gap-0.5">
      <Text className="text-muted-foreground text-xs font-semibold">
        {status.reason === "cancelled" ? "Cancelled reason:" : "Error:"}
      </Text>
      <Text className="text-muted-foreground text-xs" selectable>
        {errorText}
      </Text>
    </View>
  );
};

export const TaskCard: FC<{ part: TaskPart; className?: string }> = ({
  part,
  className,
}) => {
  const elapsedMs = useTaskElapsed(
    part.timing,
    part.status.type === "running" || part.status.type === "requires-action",
  );
  const messages = part.messages ?? [];
  const showError =
    part.status.type === "incomplete" &&
    part.status.error !== undefined &&
    part.status.error !== null;
  const result =
    showError || part.result !== undefined ? (
      <View className="gap-2">
        {showError && <TaskError status={part.status} />}
        {part.result !== undefined && <TaskResult result={part.result} />}
      </View>
    ) : undefined;

  return (
    <TaskCardBase
      className={className}
      label={taskLabel(part.toolName, part.args)}
      meta={taskMeta(part.args)}
      state={taskStateOf(part.status, part.isError)}
      elapsed={elapsedMs === undefined ? undefined : formatElapsed(elapsedMs)}
      result={result}
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
  // A selector has to return a stable value, so the lane keys travel as one string and are split afterwards.
  const laneKeys = useAuiState((s) =>
    indices
      .map((index) => {
        const part = s.message.parts[index];
        return part?.type === "tool-call" ? part.toolCallId : String(index);
      })
      .join(KEY_SEPARATOR),
  ).split(KEY_SEPARATOR);
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
    <View className={cn("aui-task-group w-full max-w-sm gap-2", className)}>
      <Text className="aui-task-group-summary text-muted-foreground px-1 text-xs">
        {summary.join(" · ")}
      </Text>
      {shown.map((index, position) => (
        <TaskLane key={laneKeys[position] ?? index} index={index} />
      ))}
      {hidden > 0 && (
        <Pressable
          accessibilityRole="button"
          hitSlop={textButtonHitSlop}
          onPress={() => setVisible((count) => count + TASK_PAGE_SIZE)}
          className="aui-task-group-more self-start px-1"
        >
          <Text className="text-muted-foreground text-xs">
            Show {Math.min(hidden, TASK_PAGE_SIZE)} more
          </Text>
        </Pressable>
      )}
    </View>
  );
};
