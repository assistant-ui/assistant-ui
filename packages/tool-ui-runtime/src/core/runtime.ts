import { ToolUIInstance, ToolUIInstanceImpl } from "./instance";
import { ToolUIHost, ToolUIHostImpl } from "./host";
import type { ToolUICallContext } from "./instance";

export type ToolUIRuntimeOptions = {
  host?: ToolUIHost;
};
export type ToolUIRuntime = {
  mount(context: ToolUICallContext): ToolUIInstance;
  update(instanceId: string, result: unknown): void;
  close(instanceId: string): void;
  get(instanceId: string): ToolUIInstance;
  list(): readonly ToolUIInstance[];
};

export class ToolUIRuntimeImpl implements ToolUIRuntime {
  private readonly _host: ToolUIHost;

  constructor(options: ToolUIRuntimeOptions = {}) {
    this._host = options.host ?? new ToolUIHostImpl();

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

    if (state.lifecycle !== "active") {
      throw new Error(`Cannot update Tool UI in state: ${state.lifecycle}`);
    }

    instance.markUpdating();
    instance.setResult(result);
    instance.markActive();
  }

  public close(instanceId: string): void {
    const instance = this._host.get(instanceId);

    instance.close();
    this._host.remove(instanceId);
  }

  public get(instanceId: string): ToolUIInstance {
    return this._host.get(instanceId);
  }

  public list(): readonly ToolUIInstance[] {
    return this._host.list();
  }
}
