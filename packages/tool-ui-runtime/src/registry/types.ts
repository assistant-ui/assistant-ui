import type { ToolUICallContext } from "../core/instance";

export type ToolUIProps = {
  readonly context: ToolUICallContext;
  readonly result?: unknown;
};

export type ToolUIRenderOutput = unknown;

export type ToolUIFactory = (props: ToolUIProps) => ToolUIRenderOutput;

export type ToolUIRegistryEntry = {
  readonly toolName: string;
  readonly factory: ToolUIFactory;
};
