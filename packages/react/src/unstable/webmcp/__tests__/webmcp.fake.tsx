import { useEffect, type ReactNode } from "react";
import { render } from "@testing-library/react";
import { expect, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
import type { ModelContextProvider } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import type {
  WebMcpAdapter,
  WebMcpModelContext,
  WebMcpToolDescriptor,
} from "../webmcp-adapter";
import {
  unstable_useWebMcpBridge,
  type Unstable_WebMcpBridgeOptions,
  type Unstable_WebMcpBridgeResult,
} from "../useWebMcpBridge";

export type FakeWebMcpAdapter = WebMcpAdapter & {
  registry: Map<string, WebMcpToolDescriptor>;
  registerCalls: string[];
  unregisterCalls: string[];
};

export const createFakeWebMcpAdapter = (): FakeWebMcpAdapter => {
  const registry = new Map<string, WebMcpToolDescriptor>();
  const registerCalls: string[] = [];
  const unregisterCalls: string[] = [];

  return {
    available: true,
    registry,
    registerCalls,
    unregisterCalls,
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
        if (registry.get(def.name) === def) registry.delete(def.name);
        unregisterCalls.push(def.name);
      };
    },
  };
};

export const createAsyncModelContext = (): Map<
  string,
  WebMcpToolDescriptor
> => {
  const registry = new Map<string, WebMcpToolDescriptor>();
  const context: WebMcpModelContext = {
    registerTool: (tool) => {
      registry.set(tool.name, tool);
      return Promise.resolve();
    },
    unregisterTool: (name) => {
      const removing = registry.get(name);
      queueMicrotask(() => {
        if (registry.get(name) === removing) registry.delete(name);
      });
    },
  };
  (document as { modelContext?: WebMcpModelContext }).modelContext = context;
  return registry;
};

export const frontendTool = (
  overrides: Partial<Tool<any, any>> = {},
): Tool<any, any> =>
  ({
    type: "frontend",
    description: "search things",
    parameters: { type: "object", properties: {} },
    execute: async () => "found",
    ...overrides,
  }) as Tool<any, any>;

export type FakeProvider = ModelContextProvider & {
  setTools: (next: Record<string, Tool<any, any>>) => void;
};

export const createProvider = (
  initialTools: Record<string, Tool<any, any>>,
): FakeProvider => {
  let tools = initialTools;
  const listeners = new Set<() => void>();
  return {
    getModelContext: () => ({ tools }),
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    setTools: (next) => {
      tools = next;
      listeners.forEach((callback) => callback());
    },
  } as FakeProvider;
};

let latest: Unstable_WebMcpBridgeResult;

export const bridgeResult = (): Unstable_WebMcpBridgeResult => latest;

const Probe = ({ options }: { options: Unstable_WebMcpBridgeOptions }) => {
  latest = unstable_useWebMcpBridge(options);
  return null;
};

const Registrar = ({ provider }: { provider: ModelContextProvider }) => {
  const aui = useAui();
  useEffect(() => aui.modelContext.register(provider), [aui, provider]);
  return null;
};

const Harness = ({
  provider,
  options,
}: {
  provider: ModelContextProvider;
  options: Unstable_WebMcpBridgeOptions;
}) => (
  <AuiProvider config={AuiConfig({ modelContext: ModelContext() } as never)}>
    <Registrar provider={provider} />
    <Probe options={options} />
  </AuiProvider>
);

export const mountBridge = (
  provider: ModelContextProvider,
  options: Unstable_WebMcpBridgeOptions = {},
  wrap: (children: ReactNode) => ReactNode = (children) => children,
) => {
  const view = render(
    <>{wrap(<Harness provider={provider} options={options} />)}</>,
  );
  return {
    view,
    rerender: (next: Unstable_WebMcpBridgeOptions) =>
      view.rerender(
        <>{wrap(<Harness provider={provider} options={next} />)}</>,
      ),
  };
};

export const waitForNames = (names: string[]) =>
  vi.waitFor(() => expect(bridgeResult().registeredToolNames).toEqual(names));

export const silenceWarnings = () =>
  vi.spyOn(console, "warn").mockImplementation(() => {});
