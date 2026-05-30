import type { ToolDefinition } from "@assistant-ui/react";

export type GenerativeUILibrary = {
  components: Record<string, any>;
};

export type GenerativeUIToolkit = Record<string, ToolDefinition<any, any>>;
