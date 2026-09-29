import type {
  ThreadMessage,
  ToolCallMessagePart,
  ToolCallMessagePartStatus,
} from "../../types/message";

/** A tool call that carries a nested conversation, read as one unit of child work; `id` is its toolCallId. */
export type TaskState = {
  readonly id: string;
  readonly toolName: string;
  readonly args: ToolCallMessagePart["args"];
  readonly result?: ToolCallMessagePart["result"];
  readonly isError?: boolean;
  readonly status: ToolCallMessagePartStatus;
  readonly timing?: ToolCallMessagePart["timing"];
  readonly messageId: string;
  readonly parentTaskId: string | null;
  readonly depth: number;
  readonly messages: readonly ThreadMessage[];
};

export type TaskMethods = {
  getState(): TaskState;
};

export type TaskMeta = {
  source: "thread";
  query: { type: "index"; index: number } | { type: "id"; id: string };
};

export type TaskClientSchema = {
  methods: TaskMethods;
  meta: TaskMeta;
};
