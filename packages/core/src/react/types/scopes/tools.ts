import type { ToolCallMessagePartComponent } from "../MessagePartComponentTypes";
import type { Unsubscribe } from "../../..";

export type ToolActivityContext = {
  toolName: string;
  /**
   * Effective status used by ChainOfThought activity derivation.
   */
  statusType?: string;
  /**
   * Raw status on the current tool-call part, if any.
   */
  partStatusType?: string;
  /**
   * Chain-of-thought group status.
   */
  chainStatusType?: string;
  /**
   * Assistant message status.
   */
  messageStatusType?: string;
  /**
   * Humanized fallback tool label.
   */
  fallbackLabel: string;
  /**
   * The active message part associated with the tool activity.
   */
  part?: unknown;
};

export type ToolActivity = (context: ToolActivityContext) => string | undefined;

export type ToolsState = {
  tools: Record<string, ToolCallMessagePartComponent[]>;
  toolActivities: Record<string, ToolActivity>;
};

export type ToolsMethods = {
  getState(): ToolsState;
  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
  ): Unsubscribe;
  setToolActivity(toolName: string, activity: ToolActivity): Unsubscribe;
};

export type ToolsClientSchema = {
  methods: ToolsMethods;
};
