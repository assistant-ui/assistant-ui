import type { ToolUIFactory, ToolUIRegistryEntry } from "./types";

export type ToolUIRegistry = {
  register(entry: ToolUIRegistryEntry): void;
  unregister(toolName: string): void;
  resolve(toolName: string): ToolUIFactory | undefined;
  list(): readonly ToolUIRegistryEntry[];
};

export class ToolUIRegistryImpl implements ToolUIRegistry {
  private readonly _entries = new Map<string, ToolUIFactory>();

  public register(entry: ToolUIRegistryEntry): void {
    if (this._entries.has(entry.toolName)) {
      throw new Error(`Tool UI already registered for tool: ${entry.toolName}`);
    }

    this._entries.set(entry.toolName, entry.factory);
  }

  public unregister(toolName: string): void {
    this._entries.delete(toolName);
  }

  public resolve(toolName: string): ToolUIFactory | undefined {
    return this._entries.get(toolName);
  }

  public list(): readonly ToolUIRegistryEntry[] {
    return Array.from(this._entries.entries()).map(([toolName, factory]) => ({
      toolName,
      factory,
    }));
  }
}
