import {
  LanguageModelV1FinishReason,
  LanguageModelV1LogProbs,
} from "@ai-sdk/provider";

export type AssistantStreamFinishPart = {
  type: "finish";
  finishReason: LanguageModelV1FinishReason;
  logprops?: LanguageModelV1LogProbs;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
};

export type AssistantStreamPart =
  | {
      type: "text-delta";
      textDelta: string;
    }
  | {
      type: "tool-call-delta";
      toolCallType: "function";
      toolCallId: string;
      toolName: string;
      argsTextDelta: string;
    }
  | AssistantStreamFinishPart
  | {
      type: "error";
      error: unknown;
    };
