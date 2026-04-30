import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../utils/json/json-value";
import type { ObjectStreamOperation } from "./object/types";
import type { ToolModelContentPart } from "./tool/tool-types";

/**
 * Initial metadata for a stream part.
 *
 * A part starts with `part-start`, receives zero or more chunks at the same
 * path, and ends with `part-finish`.
 */
export type PartInit =
  | {
      readonly type: "text" | "reasoning";
      readonly parentId?: string;
    }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly parentId?: string;
    }
  | {
      readonly type: "source";
      readonly sourceType: "url";
      readonly id: string;
      readonly url: string;
      readonly title?: string;
      readonly parentId?: string;
    }
  | {
      readonly type: "file";
      readonly data: string;
      readonly mimeType: string;
      readonly parentId?: string;
    }
  | {
      readonly type: "video";
      readonly url: string;
      readonly mimeType?: string;
      readonly filename?: string;
      readonly posterUrl?: string;
      readonly width?: number;
      readonly height?: number;
      readonly durationSeconds?: number;
      readonly providerMetadata?: ReadonlyJSONObject;
      readonly parentId?: string;
    }
  | {
      readonly type: "data";
      readonly name: string;
      readonly data: ReadonlyJSONValue;
      readonly parentId?: string;
    };

/**
 * Normalized assistant-ui streaming protocol chunk.
 *
 * `path` identifies the part or nested position the chunk belongs to. Encoders
 * may translate these chunks into provider-specific wire formats, while
 * accumulators consume them to build assistant messages.
 */
export type AssistantStreamChunk = { readonly path: readonly number[] } & (
  | {
      /** Opens a new content part at `path`. */
      readonly type: "part-start";
      readonly part: PartInit;
    }
  | {
      /** Closes the current part at `path`. */
      readonly type: "part-finish";
    }
  | {
      /** Marks streamed tool-call argument text as complete. */
      readonly type: "tool-call-args-text-finish";
    }
  | {
      /** Appends text to a text, reasoning, or tool-call argument part. */
      readonly type: "text-delta";
      readonly textDelta: string;
    }
  | {
      /** Appends provider or application annotations to the current message. */
      readonly type: "annotations";
      readonly annotations: ReadonlyJSONValue[];
    }
  | {
      /** Emits application data chunks associated with the current message. */
      readonly type: "data";
      readonly data: ReadonlyJSONValue[];
    }
  | {
      /** Starts a model generation step. */
      readonly type: "step-start";
      readonly messageId: string;
    }
  | {
      /** Finishes a model generation step and reports usage for that step. */
      readonly type: "step-finish";
      readonly finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "other"
        | "unknown";
      readonly usage: {
        readonly inputTokens: number;
        readonly outputTokens: number;
      };
      readonly isContinued: boolean;
    }
  | {
      /** Finishes the assistant message and reports final usage. */
      readonly type: "message-finish";
      readonly finishReason:
        | "stop"
        | "length"
        | "content-filter"
        | "tool-calls"
        | "error"
        | "other"
        | "unknown";
      readonly usage: {
        readonly inputTokens: number;
        readonly outputTokens: number;
      };
    }
  | {
      /**
       * Emits the result for a tool-call part.
       *
       * `artifact` is UI-visible metadata, while `modelContent` can override
       * what is sent back to the model.
       */
      readonly type: "result";
      readonly artifact?: ReadonlyJSONValue;
      readonly result: ReadonlyJSONValue;
      readonly isError: boolean;
      readonly modelContent?: readonly ToolModelContentPart[];
      readonly messages?: ReadonlyJSONValue;
    }
  | {
      /** Emits a stream-level error message. */
      readonly type: "error";
      readonly error: string;
    }
  | {
      /** Applies object-stream operations to state carried by this stream. */
      readonly type: "update-state";
      readonly operations: ObjectStreamOperation[];
    }
);
