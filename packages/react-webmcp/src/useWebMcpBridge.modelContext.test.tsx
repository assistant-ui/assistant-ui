// @vitest-environment jsdom

import { StrictMode, useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
import type { ModelContextProvider } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import type {
  WebMcpModelContext,
  WebMcpToolDescriptor,
} from "./webmcp-adapter";
import { useWebMcpBridge, type WebMcpBridgeResult } from "./useWebMcpBridge";

const createAsyncModelContext = () => {
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
    getTools: () => [...registry.values()].map(({ name }) => ({ name })),
  };
  (document as { modelContext?: WebMcpModelContext }).modelContext = context;
  return registry;
};

const createProvider = (initialTools: Record<string, Tool<any, any>>) => {
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
    setTools: (next: Record<string, Tool<any, any>>) => {
      tools = next;
      listeners.forEach((callback) => callback());
    },
  };
};

let latest: WebMcpBridgeResult;

const Probe = () => {
  latest = useWebMcpBridge();
  return null;
};

const Registrar = ({ provider }: { provider: ModelContextProvider }) => {
  const aui = useAui();
  useEffect(() => aui.modelContext.register(provider), [aui, provider]);
  return null;
};

const Harness = ({ provider }: { provider: ModelContextProvider }) => (
  <AuiProvider config={AuiConfig({ modelContext: ModelContext() } as never)}>
    <Registrar provider={provider} />
    <Probe />
  </AuiProvider>
);

const tool = (description: string): Tool<any, any> =>
  ({
    type: "frontend",
    description,
    parameters: { type: "object", properties: {} },
    execute: async () => "ok",
  }) as Tool<any, any>;

afterEach(() => {
  cleanup();
  delete (document as { modelContext?: unknown }).modelContext;
  vi.restoreAllMocks();
});

describe("useWebMcpBridge against a promise-based model context", () => {
  it("keeps the tool exposed when its description changes", async () => {
    const registry = createAsyncModelContext();
    const provider = createProvider({ search: tool("v1") });

    render(<Harness provider={provider} />);
    await vi.waitFor(() => expect(registry.has("search")).toBe(true));

    act(() => {
      provider.setTools({ search: tool("v2") });
    });

    await vi.waitFor(() =>
      expect(registry.get("search")?.description).toBe("v2"),
    );
    expect(latest.registeredToolNames).toEqual(["search"]);
  });

  it("registers under StrictMode's double-invoked effect", async () => {
    const registry = createAsyncModelContext();
    const provider = createProvider({ search: tool("v1") });

    render(
      <StrictMode>
        <Harness provider={provider} />
      </StrictMode>,
    );

    await vi.waitFor(() => expect([...registry.keys()]).toEqual(["search"]));
    expect(latest.registeredToolNames).toEqual(["search"]);
  });

  it("unregisters by name on unmount", async () => {
    const registry = createAsyncModelContext();
    const provider = createProvider({ search: tool("v1") });

    const view = render(<Harness provider={provider} />);
    await vi.waitFor(() => expect(registry.has("search")).toBe(true));

    view.unmount();
    await vi.waitFor(() => expect(registry.size).toBe(0));
  });

  it("still skips a name the page registered first", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registry = createAsyncModelContext();
    const pageOwned: WebMcpToolDescriptor = {
      name: "search",
      description: "page-owned",
      inputSchema: {},
      execute: async () => ({ content: [] }),
    };
    registry.set("search", pageOwned);
    const provider = createProvider({ search: tool("v1"), other: tool("v1") });

    render(<Harness provider={provider} />);

    await vi.waitFor(() => expect(registry.has("other")).toBe(true));
    expect(registry.get("search")).toBe(pageOwned);
    expect(latest.registeredToolNames).toEqual(["other"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"search"'));
  });

  it("leaves a page-owned tool in place when its registration is rejected", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registry = new Map<string, WebMcpToolDescriptor>();
    const pageOwned: WebMcpToolDescriptor = {
      name: "search",
      description: "page-owned",
      inputSchema: {},
      execute: async () => ({ content: [] }),
    };
    registry.set("search", pageOwned);
    (document as { modelContext?: WebMcpModelContext }).modelContext = {
      registerTool: (tool) =>
        registry.has(tool.name)
          ? Promise.reject(new Error(`"${tool.name}" is already registered`))
          : Promise.resolve(void registry.set(tool.name, tool)),
      unregisterTool: (name) => {
        registry.delete(name);
      },
      getTools: () => Promise.resolve([...registry.values()]),
    };
    const provider = createProvider({ search: tool("v1"), other: tool("v1") });

    render(<Harness provider={provider} />);

    await vi.waitFor(() => expect(registry.has("other")).toBe(true));
    await vi.waitFor(() =>
      expect(latest.registeredToolNames).toEqual(["other"]),
    );
    expect(registry.get("search")).toBe(pageOwned);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"search"'),
      expect.anything(),
    );
  });
});
