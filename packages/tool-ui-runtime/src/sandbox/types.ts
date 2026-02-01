import { ToolUIInstance } from "../core/instance";
import { ToolUIRenderOutput } from "../renderer/types";

export type ToolUISandboxOptions = Record<string, unknown>;

export interface ToolUISandbox {
  readonly type: string;

  mount(
    instance: ToolUIInstance,
    output: ToolUIRenderOutput,
    container: HTMLElement,
  ): Promise<void> | void;

  update(
    instance: ToolUIInstance,
    output: ToolUIRenderOutput,
  ): Promise<void> | void;

  unmount(): void;
}
