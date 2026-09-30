import type { RunConfig } from "@assistant-ui/core";
import type { GenericMessage, ToolJSONSchema } from "assistant-stream";

export type VSCodeModelRequest = {
  system?: string | undefined;
  messages: GenericMessage[];
  tools: Record<string, ToolJSONSchema>;
  runConfig: RunConfig;
  threadId?: string;
  [key: string]: unknown;
};
