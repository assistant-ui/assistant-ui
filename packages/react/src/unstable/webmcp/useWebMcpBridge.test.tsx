// @vitest-environment jsdom

import { StrictMode, type ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Tool } from "assistant-stream";
import type {
  WebMcpAdapter,
  WebMcpModelContext,
  WebMcpToolDescriptor,
} from "./webmcp-adapter";

const { adapterRef } = vi.hoisted(() => ({
  adapterRef: { current: null as WebMcpAdapter | null },
}));

vi.mock("./webmcp-adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./webmcp-adapter")>();
  return {
    ...actual,
    getDefaultWebMcpAdapter: (): WebMcpAdapter =>
      adapterRef.current ?? actual.getDefaultWebMcpAdapter(),
  };
});

const {
  bridgeResult,
  createAsyncModelContext,
  createFakeWebMcpAdapter,
  createProvider,
  frontendTool,
  mountBridge,
  silenceWarnings,
  waitForNames,
} = await import("./__tests__/webmcp.fake");

const useAdapter = <T extends WebMcpAdapter>(adapter: T): T => {
  adapterRef.current = adapter;
  return adapter;
};

const strict = (children: ReactNode) => <StrictMode>{children}</StrictMode>;

const backendTool = { type: "backend" } as Tool<any, any>;

afterEach(() => {
  cleanup();
  adapterRef.current = null;
  delete (document as { modelContext?: WebMcpModelContext }).modelContext;
  vi.restoreAllMocks();
});

describe("unstable_useWebMcpBridge", () => {
  it("reports unsupported and registers nothing when the page has no model context", async () => {
    const provider = createProvider({ search: frontendTool() });
    mountBridge(provider);

    await vi.waitFor(() => expect(bridgeResult().status).toBe("unsupported"));
    expect(bridgeResult().registeredToolNames).toEqual([]);
  });

  it("registers the filtered tools and reports them sorted", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    mountBridge(
      createProvider({
        search: frontendTool(),
        alpha: frontendTool({ description: "alpha" }),
        server: backendTool,
        off: frontendTool({ disabled: true }),
        broken: frontendTool({ execute: undefined }),
      }),
    );

    await waitForNames(["alpha", "search"]);
    expect(bridgeResult().status).toBe("active");
    expect([...adapter.registry.keys()].sort()).toEqual(["alpha", "search"]);
    expect(adapter.registry.get("search")?.description).toBe("search things");
  });

  it("honours a custom filter and re-syncs when the filter identity changes", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({
      search: frontendTool(),
      alpha: frontendTool(),
    });

    const { rerender } = mountBridge(provider, {
      filter: (name) => name === "search",
    });
    await waitForNames(["search"]);

    rerender({ filter: (name) => name === "alpha" });
    await waitForNames(["alpha"]);
    expect(adapter.unregisterCalls).toEqual(["search"]);
  });

  it("warns and skips a tool whose filter throws", async () => {
    const warn = silenceWarnings();
    useAdapter(createFakeWebMcpAdapter());
    mountBridge(
      createProvider({ search: frontendTool(), bad: frontendTool() }),
      {
        filter: (name) => {
          if (name === "bad") throw new Error("filter boom");
          return true;
        },
      },
    );

    await waitForNames(["search"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('tool "bad"'),
      expect.any(Error),
    );
  });

  it("adds and removes registrations as the model context changes", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: frontendTool() });
    mountBridge(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool(), alpha: frontendTool() });
    await waitForNames(["alpha", "search"]);

    provider.setTools({ alpha: frontendTool() });
    await waitForNames(["alpha"]);
    expect(adapter.unregisterCalls).toEqual(["search"]);
    expect(adapter.registerCalls).toEqual(["search", "alpha"]);
  });

  it("keeps one registration across an implementation change and calls through to the latest tool", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({
      search: frontendTool({ execute: async () => "first" }),
    });
    mountBridge(provider);
    await waitForNames(["search"]);

    const descriptor = adapter.registry.get("search")!;
    await expect(descriptor.execute({})).resolves.toEqual({
      content: [{ type: "text", text: "first" }],
    });

    provider.setTools({
      search: frontendTool({ execute: async () => "second" }),
    });
    await vi.waitFor(async () => {
      await expect(descriptor.execute({})).resolves.toEqual({
        content: [{ type: "text", text: "second" }],
      });
    });
    expect(adapter.registerCalls).toEqual(["search"]);
    expect(adapter.unregisterCalls).toEqual([]);
  });

  it("re-registers when the description or the schema changes", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: frontendTool() });
    mountBridge(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool({ description: "renamed" }) });
    await vi.waitFor(() =>
      expect(adapter.registry.get("search")?.description).toBe("renamed"),
    );
    expect(adapter.registerCalls).toEqual(["search", "search"]);
    expect(adapter.unregisterCalls).toEqual(["search"]);
    expect(bridgeResult().registeredToolNames).toEqual(["search"]);
  });

  it("does not treat a tool named after an Object.prototype key as inherited", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({
      constructor: frontendTool({ description: "ctor" }),
      toString: frontendTool({ description: "str" }),
    });
    mountBridge(provider);

    await waitForNames(["constructor", "toString"]);
    expect(adapter.registry.get("constructor")?.description).toBe("ctor");

    provider.setTools({ constructor: frontendTool({ description: "ctor" }) });
    await waitForNames(["constructor"]);
    expect(adapter.unregisterCalls).toEqual(["toString"]);
    expect(adapter.registerCalls).toEqual(["constructor", "toString"]);
  });

  it("unregisters everything on unmount and warns when a disposer throws", async () => {
    const warn = silenceWarnings();
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const { view } = mountBridge(
      createProvider({ search: frontendTool(), alpha: frontendTool() }),
    );
    await waitForNames(["alpha", "search"]);

    view.unmount();
    expect(adapter.registry.size).toBe(0);
    expect(adapter.unregisterCalls.sort()).toEqual(["alpha", "search"]);
    expect(warn).not.toHaveBeenCalled();

    const throwing = useAdapter({
      ...createFakeWebMcpAdapter(),
      registerTool: () => () => {
        throw new Error("dispose boom");
      },
    });
    const second = mountBridge(createProvider({ search: frontendTool() }));
    await waitForNames(["search"]);
    second.view.unmount();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Unregistering WebMCP tool"),
      expect.any(Error),
    );
    expect(throwing.available).toBe(true);
  });

  it("warns and skips a name registerTool synchronously refuses", async () => {
    const warn = silenceWarnings();
    const adapter = useAdapter(createFakeWebMcpAdapter());
    adapter.registry.set("search", {} as WebMcpToolDescriptor);

    mountBridge(
      createProvider({ search: frontendTool(), alpha: frontendTool() }),
    );

    await waitForNames(["alpha"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("registerTool failed"),
      expect.any(Error),
    );
    expect(adapter.registry.get("search")).toEqual({});
  });

  it("holds a single live registration under StrictMode", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    mountBridge(createProvider({ search: frontendTool() }), {}, strict);

    await waitForNames(["search"]);
    expect([...adapter.registry.keys()]).toEqual(["search"]);
    expect(bridgeResult().status).toBe("active");
  });

  it("warns and drops the name when a registration is rejected", async () => {
    const warn = silenceWarnings();
    const pageOwned: WebMcpToolDescriptor[] = [];
    const registry = createAsyncModelContext();
    const context = (document as { modelContext?: WebMcpModelContext })
      .modelContext!;
    const original = context.registerTool.bind(context);
    context.registerTool = (tool, options) => {
      if (tool.name === "search") {
        return Promise.reject(new Error("already registered"));
      }
      pageOwned.push(tool);
      return original(tool, options);
    };
    registry.set("search", { name: "search" } as WebMcpToolDescriptor);

    mountBridge(createProvider({ search: frontendTool() }));

    await vi.waitFor(() =>
      expect(bridgeResult().registeredToolNames).toEqual([]),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('tool "search" failed'),
      expect.any(Error),
    );
    expect(registry.get("search")).toEqual({ name: "search" });
  });

  it("keeps the tool exposed across a description change on an async unregisterTool", async () => {
    const registry = createAsyncModelContext();
    const provider = createProvider({ search: frontendTool() });
    mountBridge(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool({ description: "renamed" }) });
    await vi.waitFor(() =>
      expect(registry.get("search")?.description).toBe("renamed"),
    );
    await Promise.resolve();
    expect(registry.get("search")?.description).toBe("renamed");
    expect(bridgeResult().registeredToolNames).toEqual(["search"]);
  });

  it("ignores a late failure reported by a replaced registration", async () => {
    const warn = silenceWarnings();
    const calls: {
      def: WebMcpToolDescriptor;
      onError?: (error: unknown) => void;
      dispose: ReturnType<typeof vi.fn>;
    }[] = [];
    useAdapter({
      available: true,
      registerTool: (def, onError) => {
        const dispose = vi.fn();
        calls.push({ def, onError, dispose });
        return dispose;
      },
    });

    const provider = createProvider({ search: frontendTool() });
    mountBridge(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool({ description: "renamed" }) });
    await vi.waitFor(() => expect(calls).toHaveLength(2));

    calls[0]!.onError?.(new Error("late failure"));

    expect(bridgeResult().registeredToolNames).toEqual(["search"]);
    expect(calls[1]!.dispose).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
