import { Unsubscribe } from "@assistant-ui/tap";
import type { ComponentType, ReactNode } from "react";
import { ToolCallMessagePartComponent } from "../../types";

export type ToolUIState = {
  tools: Record<string, ToolCallMessagePartComponent[]>;
  fallback: ToolCallMessagePartComponent[];
  layout: ComponentType<{ children: ReactNode }>[];
};

export type ToolUIApi = {
  getState(): ToolUIState;

  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
  ): Unsubscribe;

  setFallbackToolUI(render: ToolCallMessagePartComponent): Unsubscribe;

  setToolUILayout(render: ComponentType<{ children: ReactNode }>): Unsubscribe;
};

export type ToolUIMeta = {
  source: "root";
  query: Record<string, never>;
};
