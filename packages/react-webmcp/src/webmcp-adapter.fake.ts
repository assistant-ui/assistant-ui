import type { WebMcpAdapter, WebMcpToolDescriptor } from "./webmcp-adapter";

export type FakeWebMcpAdapter = WebMcpAdapter & {
  registry: Map<string, WebMcpToolDescriptor>;
  registerCalls: string[];
  unregisterCalls: string[];
};

export const createFakeWebMcpAdapter = (
  options: { available?: boolean; withEnumeration?: boolean } = {},
): FakeWebMcpAdapter => {
  const registry = new Map<string, WebMcpToolDescriptor>();
  const registerCalls: string[] = [];
  const unregisterCalls: string[] = [];

  return {
    available: options.available ?? true,
    registry,
    registerCalls,
    unregisterCalls,
    ...(options.withEnumeration && {
      hasTool: (name: string) => registry.has(name),
    }),
    registerTool: (def) => {
      if (registry.has(def.name)) {
        throw new Error(`Tool "${def.name}" is already registered`);
      }
      registry.set(def.name, def);
      registerCalls.push(def.name);
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        if (registry.get(def.name) === def) {
          registry.delete(def.name);
        }
        unregisterCalls.push(def.name);
      };
    },
  };
};
