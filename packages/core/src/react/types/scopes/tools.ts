import type { ToolCallMessagePartComponent } from "../MessagePartComponentTypes";
import type { Unsubscribe } from "../../..";
import type { ToolCallText } from "../../../model-context/tool-call-text";

export type McpAppResourceOutput = {
  readonly render: ToolCallMessagePartComponent;
};

/**
 * A single tool-UI registration: the renderer plus its presentation options.
 * Stored as a per-tool-name list so the name stays registered while any
 * registration of it is mounted.
 */
type ToolRegistration = {
  readonly render: ToolCallMessagePartComponent;
  readonly renderText?: ToolCallText<any, any, unknown> | undefined;
  /** Whether this UI renders standalone, outside the chain-of-thought trace. */
  readonly standalone: boolean;
};

export type ToolsState = {
  /** Registered tool UIs (renderer + presentation options) keyed by tool name. */
  toolUIs: Record<string, readonly ToolRegistration[]>;
  mcpApp?: McpAppResourceOutput | undefined;
};

export type ToolsMethods = {
  getState(): ToolsState;
  setToolUI(
    toolName: string,
    render: ToolCallMessagePartComponent,
    options?: { standalone?: boolean },
  ): Unsubscribe;
};

export type ToolsClientSchema = {
  methods: ToolsMethods;
};
