import type { ToolUIInstance } from "./instance";

export type ToolUIHost = {
  create(instance: ToolUIInstance): void;
  get(id: string): ToolUIInstance;
  has(id: string): boolean;
  remove(id: string): void;
  list(): readonly ToolUIInstance[];
};

export class ToolUIHostImpl implements ToolUIHost {
  private readonly _instances = new Map<string, ToolUIInstance>();

  public create(instance: ToolUIInstance): void {
    if (this._instances.has(instance.id)) {
      throw new Error(`Tool UI instance already exists: ${instance.id}`);
    }
    this._instances.set(instance.id, instance);
  }

  public get(id: string): ToolUIInstance {
    const instance = this._instances.get(id);
    if (!instance) {
      throw new Error(`Tool UI instance not found: ${id}`);
    }
    return instance;
  }

  public has(id: string): boolean {
    return this._instances.has(id);
  }

  public remove(id: string): void {
    this._instances.delete(id);
  }

  public list(): readonly ToolUIInstance[] {
    return Array.from(this._instances.values());
  }
}
