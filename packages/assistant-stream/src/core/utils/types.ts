import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../../utils/json/json-value";
import type { ToolModelContentPart } from "../tool/tool-types";

type TextStatus =
  | {
      type: "running";
    }
  | {
      type: "complete";
      reason: "stop" | "unknown";
    }
  | {
      type: "incomplete";
      reason: "cancelled" | "length" | "content-filter" | "other";
    };

// export type StepStartPart = {
//   type: "step-start";
// };

export type TextPart = {
  type: "text";
  text: string;
  status: TextStatus;
  parentId?: string;
};

export type ReasoningPart = {
  type: "reasoning";
  text: string;
  status: TextStatus;
  parentId?: string;
};

type ToolCallStatus =
  | {
      type: "running";
      isArgsComplete: boolean;
    }
  | {
      type: "requires-action";
      reason: "tool-call-result";
    }
  | {
      type: "complete";
      reason: "stop" | "unknown";
    }
  | {
      type: "incomplete";
      reason: "cancelled" | "length" | "content-filter" | "other";
    };

/**
 * Wall-clock timing of a tool call. Accumulator-populated timings are
 * measured by the consuming accumulator, so resumed or replayed streams
 * re-measure them; hosts that need authoritative timings supply the field
 * themselves.
 */
export type ToolCallTiming = {
  /** Epoch milliseconds when the tool call started streaming or executing. */
  readonly startedAt: number;
  /** Epoch milliseconds when the result landed. Absent while the call runs. */
  readonly completedAt?: number;
};

type ToolCallPartBase = {
  type: "tool-call";
  status: ToolCallStatus;
  toolCallId: string;
  toolName: string;
  argsText: string;
  args: ReadonlyJSONObject;
  timing?: ToolCallTiming;
  artifact?: ReadonlyJSONValue;
  result?: ReadonlyJSONValue;
  modelContent?: readonly ToolModelContentPart[];
  isError?: boolean;
  parentId?: string;
};

type ToolCallPartWithoutResult = ToolCallPartBase & {
  state: "partial-call" | "call";
  result?: undefined;
  modelContent?: undefined;
};

type ToolCallPartWithResult = ToolCallPartBase & {
  state: "result";
  result: ReadonlyJSONValue;
  artifact?: ReadonlyJSONValue;
  modelContent?: readonly ToolModelContentPart[];
  isError?: boolean;
};

export type ToolCallPart = ToolCallPartWithoutResult | ToolCallPartWithResult;

export type SourcePart = {
  type: "source";
  sourceType: "url";
  id: string;
  url: string;
  title?: string;
  parentId?: string;
};

export type FilePart = {
  type: "file";
  data: string;
  mimeType: string;
  parentId?: string;
};

export type DataPart = {
  type: "data";
  name: string;
  data: ReadonlyJSONValue;
  parentId?: string;
};

export type AssistantMessagePart =
  | TextPart
  | ReasoningPart
  | ToolCallPart
  | SourcePart
  | FilePart
  | DataPart;

type AssistantMessageStepUsage = {
  inputTokens: number;
  outputTokens: number;
};

type AssistantMessageStepMetadata =
  | {
      state: "started";
      messageId: string;
    }
  | {
      state: "finished";
      messageId: string;
      finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "other"
        | "unknown";
      usage?: AssistantMessageStepUsage;
      isContinued: boolean;
    };

export type AssistantMessageStatus =
  | {
      type: "running";
    }
  | {
      type: "requires-action";
      reason: "tool-calls";
    }
  | {
      type: "complete";
      reason: "stop" | "unknown";
    }
  | {
      type: "incomplete";
      reason:
        | "cancelled"
        | "tool-calls"
        | "length"
        | "content-filter"
        | "other"
        | "error";
      error?: ReadonlyJSONValue;
    };

export type AssistantMessageTiming = {
  /** Timestamp when the stream started (ms since epoch) */
  streamStartTime: number;
  /** Time to first text token (ms), undefined if no text was generated */
  firstTokenTime?: number;
  /** Total stream duration (ms) */
  totalStreamTime?: number;
  /** Estimated or actual completion token count */
  tokenCount?: number;
  /** Tokens per second throughput */
  tokensPerSecond?: number;
  /** Total number of chunks received */
  totalChunks: number;
  /** Number of tool calls in the message */
  toolCallCount: number;
};

export type AssistantMessage = {
  role: "assistant";
  status: AssistantMessageStatus;
  parts: AssistantMessagePart[];
  /**
   * @deprecated Use `parts` instead.
   */
  content: AssistantMessagePart[];

  metadata: {
    unstable_state: ReadonlyJSONValue;
    unstable_data: ReadonlyJSONValue[];
    unstable_annotations: ReadonlyJSONValue[];
    steps: AssistantMessageStepMetadata[];
    custom: Record<string, unknown>;
    timing?: AssistantMessageTiming;
  };
};
