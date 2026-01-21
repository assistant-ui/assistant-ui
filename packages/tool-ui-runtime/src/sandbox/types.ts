import { ToolUIInstance } from "../core/instance";
import { ToolUIRenderOutput } from "../registry/types";

export type ToolUISandboxOptions = Record<string, unknown>;

export interface ToolUISandbox {
  readonly type: string;

  mount(
    instance: ToolUIInstance,
    output: ToolUIRenderOutput,
  ): Promise<void> | void;

  update(instance: ToolUIInstance, output: ToolUIRenderOutput): void;

  destroy(): void;
}
