export type AssistantStreamPart =
  | {
      type: "text-delta";
      textDelta: string;
    }
  | {
      type: "tool-call-delta";
      toolCallId: string;
      toolName: string;
      argsTextDelta: string;
    }
  | {
      type: "error";
      error: unknown;
    };
