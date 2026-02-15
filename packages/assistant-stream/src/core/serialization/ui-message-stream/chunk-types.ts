import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../../../utils/json/json-value";

type FinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other"
  | "unknown";

type Usage = {
  inputTokens: number;
  outputTokens: number;
};

export type UIMessageStreamChunk =
  | { type: "start"; messageId: string }
  | { type: "text-start"; id: string }
  | { type: "text-delta"; textDelta: string }
  | { type: "text-end" }
  | { type: "reasoning-start"; id: string }
  | { type: "reasoning-delta"; delta: string }
  | { type: "reasoning-end" }
  | {
      type: "source";
      source: { sourceType: "url"; id: string; url: string; title?: string };
    }
  | { type: "file"; file: { mimeType: string; data: string } }
  | {
      type: "component";
      component: {
        name: string;
        instanceId?: string;
        props?: ReadonlyJSONObject;
        parentId?: string;
      };
    }
  | {
      type: "tool-call-start";
      id: string;
      toolCallId: string;
      toolName: string;
    }
  | { type: "tool-call-delta"; argsText: string }
  | { type: "tool-call-end" }
  | {
      type: "tool-result";
      toolCallId: string;
      result: ReadonlyJSONValue;
      isError?: boolean;
    }
  | { type: "start-step"; messageId?: string }
  | {
      type: "finish-step";
      finishReason: FinishReason;
      usage: Usage;
      isContinued: boolean;
    }
  | { type: "finish"; finishReason: FinishReason; usage: Usage }
  | { type: "error"; errorText: string }
  | UIMessageStreamDataChunk;

export type UIMessageStreamDataChunk = {
  type: `data-${string}`;
  id?: string;
  data: ReadonlyJSONValue;
  transient?: boolean;
};
