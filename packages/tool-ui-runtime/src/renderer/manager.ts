import { ToolUICallContext, ToolUIInstance } from "../core/instance";
import { ToolUIRuntime } from "../core/runtime";
import { ToolUIRegistry } from "../registry/registry";
import { ToolUISandbox } from "../sandbox/types";

export type ToolUIManagerOptions = {
  runtime: ToolUIRuntime;
  registry: ToolUIRegistry;
  createSandbox: () => ToolUISandbox;
};

export class ToolUIManager {
  private readonly _runtime: ToolUIRuntime;
  private readonly _registry: ToolUIRegistry;
  private readonly _createSandbox: () => ToolUISandbox;
  private readonly _sandboxes = new Map<string, ToolUISandbox>();

  constructor(options: ToolUIManagerOptions) {
    this._runtime = options.runtime;
    this._registry = options.registry;
    this._createSandbox = options.createSandbox;

    this.__internal_bindMethods();
  }

  protected __internal_bindMethods() {
    this.mount = this.mount.bind(this);
    this.update = this.update.bind(this);
    this.close = this.close.bind(this);
    this.get = this.get.bind(this);
    this.list = this.list.bind(this);
  }

  public async mount(context: ToolUICallContext): Promise<ToolUIInstance> {
    const instance = await this._runtime.mount(context);
    const id = instance.getState().id;

    const factory = this._registry.get(context.toolName);
    if (!factory) {
      return instance;
    }

    const sandbox = this._createSandbox();
    this._sandboxes.set(id, sandbox);

    const output = factory({
      context,
    });

    await sandbox.mount(instance, output);

    return instance;
  }

  public update(instanceId: string, result: unknown): void {
    this._runtime.update(instanceId, result);

    const sandbox = this._sandboxes.get(instanceId);
    if (!sandbox) return;

    const instance = this._runtime.get(instanceId);
    const state = instance.getState();

    const factory = this._registry.get(state.context.toolName);
    if (!factory) return;

    const output = factory({
      context: state.context,
      result,
    });

    sandbox.update(instance, output);
  }

  public close(instanceId: string) {
    const sandbox = this._sandboxes.get(instanceId);
    if (!sandbox) return;
    sandbox.destroy();
    this._sandboxes.delete(instanceId);
    this._runtime.close(instanceId);
  }

  public get(instanceId: string): ToolUIInstance | void {
    const instance = this._runtime.get(instanceId);
    if (!instanceId) return;
    return instance;
  }

  public list(): readonly ToolUIInstance[] | [] {
    const list = this._runtime.list();
    if (!list) return [];
    return list;
  }
}
