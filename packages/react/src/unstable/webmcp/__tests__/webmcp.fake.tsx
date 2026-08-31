import { useEffect, type ReactNode } from "react";
import { render } from "@testing-library/react";
import { expect, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
import type { ModelContextProvider } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import type {
  WebMcpHost,
  WebMcpModelContext,
  WebMcpToolDescriptor,
} from "../webmcp-host";
import {
  unstable_useWebMcpProvider,
  type Unstable_WebMcpProviderOptions,
  type Unstable_WebMcpProviderResult,
} from "../useWebMcpProvider";

export type FakeWebMcpHost = WebMcpHost & {
  registry: Map<string, WebMcpToolDescriptor>;
  registerCalls: string[];
  unregisterCalls: string[];
};

export const createFakeWebMcpHost = (): FakeWebMcpHost => {
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

// Mirrors the spec's registerTool: the tool enters the map synchronously while
// the promise resolves on a later task, aborting removes it and rejects, and a
// name already in the map is refused.
export const createAsyncModelContext = (): Map<
  string,
  WebMcpToolDescriptor
> => {
  const registry = new Map<string, WebMcpToolDescriptor>();
  const context: WebMcpModelContext = {
    registerTool: (tool, options) => {
      if (registry.has(tool.name)) {
        return Promise.reject(
          new DOMException(
            `Tool "${tool.name}" is already registered`,
            "InvalidStateError",
          ),
        );
      }
      registry.set(tool.name, tool);
      return new Promise<void>((resolve, reject) => {
        options?.signal?.addEventListener("abort", () => {
          registry.delete(tool.name);
          reject(options.signal?.reason);
        });
        setTimeout(() => resolve(), 0);
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

let latest: Unstable_WebMcpProviderResult;

export const providerResult = (): Unstable_WebMcpProviderResult => latest;

const Probe = ({ options }: { options: Unstable_WebMcpProviderOptions }) => {
  latest = unstable_useWebMcpProvider(options);
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
  options: Unstable_WebMcpProviderOptions;
}) => (
  <AuiProvider config={AuiConfig({ modelContext: ModelContext() } as never)}>
    <Registrar provider={provider} />
    <Probe options={options} />
  </AuiProvider>
);

export const mountProvider = (
  provider: ModelContextProvider,
  options: Unstable_WebMcpProviderOptions = {},
  wrap: (children: ReactNode) => ReactNode = (children) => children,
) => {
  const view = render(
    <>{wrap(<Harness provider={provider} options={options} />)}</>,
  );
  return {
    view,
    rerender: (next: Unstable_WebMcpProviderOptions) =>
      view.rerender(
        <>{wrap(<Harness provider={provider} options={next} />)}</>,
      ),
  };
};

export const waitForNames = (names: string[]) =>
  vi.waitFor(() => expect(providerResult().registeredToolNames).toEqual(names));

export const silenceWarnings = () =>
  vi.spyOn(console, "warn").mockImplementation(() => {});
