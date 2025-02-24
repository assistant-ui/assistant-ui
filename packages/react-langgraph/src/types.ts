import { ReadonlyJSONObject } from "../../react/src/utils/json/json-value";

export type LangChainToolCallChunk = {
  index: number;
  id: string;
  name: string;
  args: string;
};

export type LangChainToolCall = {
  id: string;
  name: string;
  argsText: string;
  args: ReadonlyJSONObject;
};

type MessageContentText = {
  type: "text";
  text: string;
};

type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | { url: string };
};

type MessageContentToolUse = {
  type: "tool_use";
};

type UserMessageContentComplex = MessageContentText | MessageContentImageUrl;
type AssistantMessageContentComplex =
  | MessageContentText
  | MessageContentToolUse;

type UserMessageContent = string | UserMessageContentComplex[];
type AssistantMessageContent = string | AssistantMessageContentComplex[];

export type LangChainMessage =
  | {
      id?: string;
      type: "system";
      content: string;
    }
  | {
      id?: string;
      type: "human";
      content: UserMessageContent;
    }
  | {
      id?: string;
      type: "tool";
      content: string;
      tool_call_id: string;
      name: string;
      artifact?: any;
    }
  | {
      id?: string;
      type: "ai";
      content: AssistantMessageContent;
      tool_call_chunks?: LangChainToolCallChunk[];
      tool_calls?: LangChainToolCall[];
    };

export type LangChainMessageChunk = {
  id: string;
  type: "AIMessageChunk";
  content: (AssistantMessageContentComplex & { index: number })[];
  tool_call_chunks: LangChainToolCallChunk[];
};

export type LangChainEvent = {
  event: "messages/partial" | "messages/complete";
  data: LangChainMessage[];
};
