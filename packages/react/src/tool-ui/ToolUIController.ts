import {
  ToolUIInstance,
  ToolUIRuntime,
  ToolUIRuntimeImpl,
} from "@assistant-ui/tool-ui-runtime";
import type { ToolUICallContext } from "@assistant-ui/tool-ui-runtime";

export class ToolUIController {
  private readonly _runtime: ToolUIRuntime;
  private readonly _instances = new Map<string, ToolUIInstance>();

  constructor(runtime?: ToolUIRuntime) {
    this._runtime = runtime ?? new ToolUIRuntimeImpl();
  }

  /**
   * Called when a tool-call part first appears in the stream
   */
  public onToolCallStart(context: ToolUICallContext): ToolUIInstance {
    const id = context.toolCallId;

    const existing = this._instances.get(id);
    if (existing) {
      return existing;
    }

    const instance = this._runtime.mount(context);
    this._instances.set(id, instance);

    return instance;
  }

  /**
   * Called when tool result arrives
   */
  public onToolCallResult(toolCallId: string, result: unknown): void {
    const instance = this._instances.get(toolCallId);
    if (!instance) return;

    this._runtime.update(toolCallId, result);
  }

  /**
   * Called when tool-call lifecycle is finished
   */
  public onToolCallEnd(toolCallId: string): void {
    const instance = this._instances.get(toolCallId);
    if (!instance) return;

    this._runtime.close(toolCallId);
    this._instances.delete(toolCallId);
  }

  public list(): readonly ToolUIInstance[] {
    return this._runtime.list();
  }

  public get runtime(): ToolUIRuntime {
    return this._runtime;
  }
}
