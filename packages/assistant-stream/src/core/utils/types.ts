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

type TextContentPart = {
  type: "text";
  text: string;
  status: TextStatus;
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

export type ToolCallContentPart = {
  type: "tool-call";
  status: ToolCallStatus;
  toolCallId: string;
  toolName: string;
  argsText: string;
  args: Record<string, unknown>;
  result?: unknown;
};

type AssistantMessageContentPart = TextContentPart | ToolCallContentPart;

type AssistantMessageStepMetadata = {};

export type AssitantMessageStatus =
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
      error?: unknown;
    };

export type AssistantMessage = {
  role: "assistant";
  status: AssitantMessageStatus;
  content: AssistantMessageContentPart[];
  metadata: {
    steps: AssistantMessageStepMetadata[];
    custom: Record<string, unknown>;
  };
};
