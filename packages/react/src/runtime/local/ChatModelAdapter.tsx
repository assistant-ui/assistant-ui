"use client";
import type {
  AssistantContentPart,
  ThreadMessage,
} from "../../utils/AssistantTypes";

type ChatModelRunResult = {
  content: AssistantContentPart[];
};

export type ChatModelRunOptions = {
  messages: ThreadMessage[];
  abortSignal: AbortSignal;
  onUpdate: (result: ChatModelRunResult) => void;
};

export type ChatModelAdapter = {
  run: (options: ChatModelRunOptions) => Promise<ChatModelRunResult>;
};
