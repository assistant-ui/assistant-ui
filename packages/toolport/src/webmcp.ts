import { callTool, listTools } from "./toolkit";
import type { JsonSchema, Toolkit } from "./types";

export type WebMcpToolRegistration = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  readonly execute: (args: unknown) => Promise<unknown>;
};

export type ModelContext = {
  registerTool?: (tool: WebMcpToolRegistration) => void;
  unregisterTool?: (name: string) => void;
  provideContext?: (context: { tools: WebMcpToolRegistration[] }) => void;
};

export const toWebMcpTools = (toolkit: Toolkit): WebMcpToolRegistration[] =>
  listTools(toolkit).map((descriptor) => ({
    ...descriptor,
    execute: (args) => callTool(toolkit, descriptor.name, args),
  }));

const resolveModelContext = (): ModelContext | undefined =>
  (globalThis.navigator as { modelContext?: ModelContext } | undefined)
    ?.modelContext;

export const registerWebMcp = (
  toolkit: Toolkit,
  modelContext: ModelContext | undefined = resolveModelContext(),
): (() => void) => {
  if (!modelContext) return () => {};
  const tools = toWebMcpTools(toolkit);
  if (modelContext.registerTool) {
    for (const tool of tools) modelContext.registerTool(tool);
    return () => {
      for (const tool of tools) modelContext.unregisterTool?.(tool.name);
    };
  }
  modelContext.provideContext?.({ tools });
  return () => modelContext.provideContext?.({ tools: [] });
};
