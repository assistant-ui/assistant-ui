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

type MessageContentText = {
  type: "text";
  text: string;
};

type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | { url: string };
};

type MessageContentComplex = MessageContentText | MessageContentImageUrl;

type MessageContent = string | MessageContentComplex[];

export type LangChainMessage =
  | {
      id?: string;
      type: "system";
      content: string;
    }
  | {
      id?: string;
      type: "human";
      content: MessageContent;
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
