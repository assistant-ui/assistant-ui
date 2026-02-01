import type {
  ToolUIRuntime,
  ToolUIInstance,
  ToolUICallContext,
} from "@assistant-ui/tool-ui-runtime";

export class ToolUIController {
  private readonly _runtime: ToolUIRuntime;
  private readonly _instances = new Map<string, ToolUIInstance>();

  constructor(runtime: ToolUIRuntime) {
    this._runtime = runtime;
  }

  /**
   * Called when a tool-call part first appears in the stream
   */
  public onToolCallStart(context: ToolUICallContext): ToolUIInstance {
    const id = context.toolCallId;

    // Check controller's local cache first
    const existing = this._instances.get(id);
    if (existing) {
      return existing;
    }

    try {
      const runtimeInstance = this._runtime.get(id);
      if (runtimeInstance) {
        this._instances.set(id, runtimeInstance);
        return runtimeInstance;
      }
    } catch (_e) {
      // Instance doesn't exist in runtime, continue to create it
    }

    const instance = this._runtime.mount(context);
    this._instances.set(id, instance);

    return instance;
  }

  /**
   * Called when tool result arrives
   */
  public onToolCallResult(id: string, result: unknown): void {
    // Ensure we have the instance in our local cache
    let instance = this._instances.get(id);
    if (!instance) {
      try {
        instance = this._runtime.get(id);
        if (instance) {
          this._instances.set(id, instance);
        }
      } catch (_e) {
        console.warn("[ToolUI][controller] Instance not found for result:", id);
        return;
      }
    }

    this._runtime.update(id, result);
  }

  /**
   * Called when tool call ends (e.g., message is removed from thread)
   */
  public onToolCallEnd(id: string): void {
    const instance = this._instances.get(id);
    if (instance) {
      this._runtime.close(id);
      this._instances.delete(id);
    }
  }

  /**
   * Get all instances managed by this controller
   */
  public getInstances(): ToolUIInstance[] {
    try {
      return [...this._runtime.list()];
    } catch (_e) {
      return [...this._instances.values()];
    }
  }

  /**
   * Get a specific instance by ID
   */
  public getInstance(id: string): ToolUIInstance | undefined {
    let instance = this._instances.get(id);
    if (!instance) {
      try {
        instance = this._runtime.get(id);
        if (instance) {
          this._instances.set(id, instance);
        }
      } catch (_e) {
        // Instance doesn't exist
      }
    }
    return instance;
  }
}
