// @vitest-environment jsdom

import { StrictMode, useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
import type { ModelContextProvider } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import { createFakeWebMcpAdapter } from "./webmcp-adapter.fake";
import {
  useWebMcpBridge,
  type WebMcpBridgeOptions,
  type WebMcpBridgeResult,
} from "./useWebMcpBridge";

const searchTool: Tool<any, any> = {
  type: "frontend",
  description: "search things",
  parameters: { type: "object", properties: {} },
  execute: async () => "found",
} as Tool<any, any>;

const backendTool = { type: "backend" } as Tool<any, any>;

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

const Probe = ({ options }: { options: WebMcpBridgeOptions }) => {
  latest = useWebMcpBridge(options);
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
  options: WebMcpBridgeOptions;
}) => (
  <AuiProvider config={AuiConfig({ modelContext: ModelContext() } as never)}>
    <Registrar provider={provider} />
    <Probe options={options} />
  </AuiProvider>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useWebMcpBridge", () => {
  it("registers filtered tools on mount and reports them", async () => {
    const adapter = createFakeWebMcpAdapter();
    const provider = createProvider({
      search: searchTool,
      server: backendTool,
      off: { ...searchTool, disabled: true } as Tool<any, any>,
    });

    render(<Harness provider={provider} options={{ adapter }} />);

    await vi.waitFor(() => {
      expect([...adapter.registry.keys()]).toEqual(["search"]);
    });
    expect(latest.status).toBe("active");
    expect(latest.registeredToolNames).toEqual(["search"]);
    expect(adapter.registry.get("search")?.description).toBe("search things");
  });

  it("re-syncs when the model context changes", async () => {
    const adapter = createFakeWebMcpAdapter();
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{ adapter }} />);
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));

    const extraTool: Tool<any, any> = {
      ...searchTool,
      description: "extra tool",
    } as Tool<any, any>;
    act(() => {
      provider.setTools({ search: searchTool, extra: extraTool });
    });
    await vi.waitFor(() => expect(adapter.registry.has("extra")).toBe(true));
    expect(latest.registeredToolNames).toEqual(["extra", "search"]);

    act(() => {
      provider.setTools({ search: searchTool });
    });
    await vi.waitFor(() => expect(adapter.registry.has("extra")).toBe(false));
    expect(adapter.unregisterCalls).toContain("extra");
    expect(adapter.registry.has("search")).toBe(true);
    expect(latest.registeredToolNames).toEqual(["search"]);
  });

  it("re-registers a tool whose description or schema changed", async () => {
    const adapter = createFakeWebMcpAdapter();
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{ adapter }} />);
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));
    const initialRegisterCount = adapter.registerCalls.length;

    act(() => {
      provider.setTools({
        search: { ...searchTool, description: "search harder" } as Tool<
          any,
          any
        >,
      });
    });

    await vi.waitFor(() =>
      expect(adapter.registry.get("search")?.description).toBe("search harder"),
    );
    expect(adapter.unregisterCalls).toContain("search");
    expect(adapter.registerCalls.length).toBe(initialRegisterCount + 1);
  });

  it("does not re-register when the registry notifies without changes", async () => {
    const adapter = createFakeWebMcpAdapter();
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{ adapter }} />);
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));
    const registerCount = adapter.registerCalls.length;

    act(() => {
      provider.setTools({ search: searchTool });
    });

    expect(adapter.registerCalls.length).toBe(registerCount);
    expect(adapter.unregisterCalls).toEqual([]);
  });

  it("unregisters everything on unmount", async () => {
    const adapter = createFakeWebMcpAdapter();
    const provider = createProvider({ search: searchTool });

    const view = render(<Harness provider={provider} options={{ adapter }} />);
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));

    view.unmount();
    expect(adapter.registry.size).toBe(0);
    expect(adapter.unregisterCalls).toContain("search");
  });

  it("is StrictMode-safe: the double-invoked effect leaves one live registration", async () => {
    const adapter = createFakeWebMcpAdapter();
    const provider = createProvider({ search: searchTool });

    const view = render(
      <StrictMode>
        <Harness provider={provider} options={{ adapter }} />
      </StrictMode>,
    );

    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));
    expect(adapter.registry.size).toBe(1);
    expect(adapter.registerCalls.length).toBe(
      adapter.unregisterCalls.length + 1,
    );

    view.unmount();
    expect(adapter.registry.size).toBe(0);
  });

  it("stays inert when the environment is unsupported", async () => {
    const adapter = createFakeWebMcpAdapter({ available: false });
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{ adapter }} />);

    await act(async () => {});
    expect(latest.status).toBe("unsupported");
    expect(latest.registeredToolNames).toEqual([]);
    expect(adapter.registerCalls).toEqual([]);
  });

  it("warns and skips a tool whose filter throws while registering the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = createFakeWebMcpAdapter();
    const otherTool: Tool<any, any> = {
      ...searchTool,
      description: "other",
    } as Tool<any, any>;
    const provider = createProvider({ search: searchTool, other: otherTool });

    render(
      <Harness
        provider={provider}
        options={{
          adapter,
          filter: (name) => {
            if (name === "search") throw new Error("bad predicate");
            return true;
          },
        }}
      />,
    );

    await vi.waitFor(() => expect(adapter.registry.has("other")).toBe(true));
    expect(adapter.registry.has("search")).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"search"'),
      expect.anything(),
    );
    expect(latest.registeredToolNames).toEqual(["other"]);
  });

  it("skips a collision via the adapter's enumeration capability without calling registerTool", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = createFakeWebMcpAdapter({ withEnumeration: true });
    adapter.registry.set("search", {
      name: "search",
      description: "app-owned",
      inputSchema: {},
      execute: async () => ({ content: [] }),
    });
    const otherTool: Tool<any, any> = {
      ...searchTool,
      description: "other",
    } as Tool<any, any>;
    const provider = createProvider({ search: searchTool, other: otherTool });

    render(<Harness provider={provider} options={{ adapter }} />);

    await vi.waitFor(() => expect(adapter.registry.has("other")).toBe(true));
    expect(adapter.registerCalls).toEqual(["other"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"search"'));
    expect(latest.registeredToolNames).toEqual(["other"]);
  });

  it("does not tear down registrations when inline options change identity every render", async () => {
    const adapter = createFakeWebMcpAdapter();
    const provider = createProvider({ search: searchTool });

    const view = render(
      <Harness
        provider={provider}
        options={{ adapter, filter: () => true, approval: () => true }}
      />,
    );
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));
    const registerCount = adapter.registerCalls.length;

    view.rerender(
      <Harness
        provider={provider}
        options={{ adapter, filter: () => true, approval: () => true }}
      />,
    );

    await act(async () => {});
    expect(adapter.registerCalls.length).toBe(registerCount);
    expect(adapter.unregisterCalls).toEqual([]);
  });

  it("warns and skips on a name collision without touching the app's registration", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = createFakeWebMcpAdapter();
    const appOwned = {
      name: "search",
      description: "app-owned",
      inputSchema: {},
      execute: async () => ({ content: [] }),
    };
    adapter.registry.set("search", appOwned);

    const otherTool: Tool<any, any> = {
      ...searchTool,
      description: "other",
    } as Tool<any, any>;
    const provider = createProvider({ search: searchTool, other: otherTool });

    const view = render(<Harness provider={provider} options={{ adapter }} />);

    await vi.waitFor(() => expect(adapter.registry.has("other")).toBe(true));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"search"'),
      expect.anything(),
    );
    expect(adapter.registry.get("search")).toBe(appOwned);
    expect(latest.registeredToolNames).toEqual(["other"]);

    view.unmount();
    expect(adapter.registry.get("search")).toBe(appOwned);
    expect(adapter.registry.has("other")).toBe(false);
  });
});
