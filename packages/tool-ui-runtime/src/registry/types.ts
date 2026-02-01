import type { ToolUICallContext } from "../core/instance";
import { ToolUILifecycleState } from "../core/lifecycle";
import { ToolUIRenderOutput } from "../renderer/types";

export type ToolUIFactoryProps = {
  readonly id: string;
  readonly context: ToolUICallContext;
  readonly lifecycle: ToolUILifecycleState;
  readonly result?: unknown;
};

export type ToolUIFactory = (props: ToolUIFactoryProps) => ToolUIRenderOutput;

export type ToolUIRegistryEntry = {
  readonly toolName: string;
  readonly factory: ToolUIFactory;
};
