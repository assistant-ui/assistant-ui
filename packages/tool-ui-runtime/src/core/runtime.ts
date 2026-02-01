import { ToolUIRegistry } from "../registry/registry";
import { ToolUISandbox } from "../sandbox/types";
import { ToolUIRendererManager } from "../renderer/manager";
import {
  ToolUICallContext,
  ToolUIInstance,
  ToolUIInstanceImpl,
} from "./instance";
import { ToolUIHost, ToolUIHostImpl } from "./host";

export type ToolUIRuntimeOptions = {
  registry: ToolUIRegistry;
  createSandbox: () => ToolUISandbox;
};

export type ToolUIRuntime = {
  mount(context: ToolUICallContext): ToolUIInstance;
  update(instanceId: string, result: unknown): void;
  close(instanceId: string): void;
  get(instanceId: string): ToolUIInstance;
  list(): readonly ToolUIInstance[];
  dispose(): void;
};

/**
 * TODO: multi-agent routing support
 */
export class ToolUIRuntimeImpl implements ToolUIRuntime {
  private readonly _host: ToolUIHost;
  private readonly _renderer: ToolUIRendererManager;

  constructor(options: ToolUIRuntimeOptions) {
    this._host = new ToolUIHostImpl();

    this._renderer = new ToolUIRendererManager({
      registry: options.registry,
      createSandbox: options.createSandbox,
    });

    this.__internal_bindMethods();
  }

  protected __internal_bindMethods() {
    this.mount = this.mount.bind(this);
    this.update = this.update.bind(this);
    this.close = this.close.bind(this);
    this.get = this.get.bind(this);
    this.list = this.list.bind(this);
  }

  public mount(context: ToolUICallContext): ToolUIInstance {
    const id = context.toolCallId;

    const instance = new ToolUIInstanceImpl(id, context);

    this._host.create(instance);

    instance.resolve();
    instance.markMounting();
    instance.markActive();

    return instance;
  }

  public update(instanceId: string, result: unknown): void {
    const instance = this._host.get(instanceId);
    const state = instance.getState();

    if (state.lifecycle !== "active" && state.lifecycle !== "updating") {
      throw new Error(`Cannot update Tool UI in state: ${state.lifecycle}`);
    }

    instance.markUpdating();
    instance.setResult(result);

    this._renderer.update(instance);

    instance.markActive();
  }

  public close(instanceId: string): void {
    const instance = this._host.get(instanceId);

    this._renderer.unmount(instance);

    instance.close();
    this._host.remove(instanceId);
  }

  public get(instanceId: string): ToolUIInstance {
    return this._host.get(instanceId);
  }

  public list(): readonly ToolUIInstance[] {
    return this._host.list();
  }

  public dispose(): void {
    const instances = this.list();
    for (const instance of instances) {
      try {
        this.close(instance.id);
      } catch (error) {
        console.error(
          `[ToolUIRuntime] Failed to close instance ${instance.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Internal access for React integration
   */
  public __internal_getRenderer(): ToolUIRendererManager {
    return this._renderer;
  }
}
