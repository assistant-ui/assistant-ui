
export type SerializedTool = {
  description?: string;
  parameters: any; // JSON Schema
  disabled?: boolean;
  type?: string;
};

export type SerializedModelContext = {
  system?: string;
  tools?: Record<string, SerializedTool>;
};

export type FrameMessageType = 
  | "model-context-request"
  | "model-context-response"
  | "model-context-update"
  | "model-context-subscribe"
  | "model-context-unsubscribe"
  | "tool-call"
  | "tool-result";

export type FrameMessage = 
  | {
      type: "model-context-request";
      id: string;
    }
  | {
      type: "model-context-response";
      id: string;
      context: SerializedModelContext;
    }
  | {
      type: "model-context-update";
      context: SerializedModelContext;
    }
  | {
      type: "model-context-subscribe";
      id: string;
    }
  | {
      type: "model-context-unsubscribe";
      id: string;
    }
  | {
      type: "tool-call";
      id: string;
      toolName: string;
      args: unknown;
    }
  | {
      type: "tool-result";
      id: string;
      result?: unknown;
      error?: string;
    };

export const FRAME_MESSAGE_CHANNEL = "assistant-ui-frame";