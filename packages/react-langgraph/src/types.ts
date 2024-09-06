export type LangChainToolCallChunk = {
  id: string;
  name: string;
  args: string;
};

export type LangChainToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export type LangChainMessage =
  | {
      id?: string;
      type: "human" | "system";
      content: string;
    }
  | {
      id?: string;
      type: "tool";
      content: string;
      tool_call_id: string;
      name: string;
    }
  | {
      id?: string;
      type: "ai";
      content: string;
      tool_call_chunks?: LangChainToolCallChunk[];
      tool_calls?: LangChainToolCall[];
    };

export type LangChainEvent = {
  event: "messages/partial" | "messages/complete";
  data: LangChainMessage[];
};
