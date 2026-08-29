// @vitest-environment jsdom

import { StrictMode, type ReactNode } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Tool } from "assistant-stream";
import type {
  WebMcpHost,
  WebMcpModelContext,
  WebMcpToolDescriptor,
} from "./webmcp-host";

const { hostRef } = vi.hoisted(() => ({
  hostRef: { current: null as WebMcpHost | null },
}));

vi.mock("./webmcp-host", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./webmcp-host")>();
  return {
    ...actual,
    getDefaultWebMcpHost: (): WebMcpHost =>
      hostRef.current ?? actual.getDefaultWebMcpHost(),
  };
});

const {
  providerResult,
  createAsyncModelContext,
  createFakeWebMcpHost,
  createProvider,
  frontendTool,
  mountProvider,
  silenceWarnings,
  waitForNames,
} = await import("./__tests__/webmcp.fake");

const useHost = <T extends WebMcpHost>(host: T): T => {
  hostRef.current = host;
  return host;
};

const strict = (children: ReactNode) => <StrictMode>{children}</StrictMode>;

const backendTool = { type: "backend" } as Tool<any, any>;

afterEach(() => {
  cleanup();
  hostRef.current = null;
  delete (document as { modelContext?: WebMcpModelContext }).modelContext;
  vi.restoreAllMocks();
});

describe("unstable_useWebMcpProvider", () => {
  it("reports unsupported and registers nothing when the page has no model context", async () => {
    const provider = createProvider({ search: frontendTool() });
    mountProvider(provider);

    await vi.waitFor(() => expect(providerResult().status).toBe("unsupported"));
    expect(providerResult().registeredToolNames).toEqual([]);
  });

  it("registers the filtered tools and reports them sorted", async () => {
    const host = useHost(createFakeWebMcpHost());
    mountProvider(
      createProvider({
        search: frontendTool(),
        alpha: frontendTool({ description: "alpha" }),
        server: backendTool,
        off: frontendTool({ disabled: true }),
        broken: frontendTool({ execute: undefined }),
      }),
    );

    await waitForNames(["alpha", "search"]);
    expect(providerResult().status).toBe("active");
    expect([...host.registry.keys()].sort()).toEqual(["alpha", "search"]);
    expect(host.registry.get("search")?.description).toBe("search things");
  });

  it("honours a custom filter and re-syncs when the filter identity changes", async () => {
    const host = useHost(createFakeWebMcpHost());
    const provider = createProvider({
      search: frontendTool(),
      alpha: frontendTool(),
    });

    const { rerender } = mountProvider(provider, {
      filter: (name) => name === "search",
    });
    await waitForNames(["search"]);

    rerender({ filter: (name) => name === "alpha" });
    await waitForNames(["alpha"]);
    expect(host.unregisterCalls).toEqual(["search"]);
  });

  it("warns and skips a tool whose filter throws", async () => {
    const warn = silenceWarnings();
    useHost(createFakeWebMcpHost());
    mountProvider(
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

  it("warns once for a tool whose filter keeps throwing", async () => {
    const warn = silenceWarnings();
    const adapter = useHost(createFakeWebMcpHost());
    const bad = frontendTool();
    const provider = createProvider({ bad, search: frontendTool() });
    mountProvider(provider, {
      filter: (_name, tool) => {
        if (tool === bad) throw new Error("filter boom");
        return true;
      },
    });
    await waitForNames(["search"]);
    expect(warn).toHaveBeenCalledOnce();

    provider.setTools({ bad, search: frontendTool(), extra: frontendTool() });
    await waitForNames(["extra", "search"]);
    expect(warn).toHaveBeenCalledOnce();
    expect(adapter.registry.has("bad")).toBe(false);
  });

  it("re-attempts a tool whose filter stops throwing", async () => {
    const warn = silenceWarnings();
    const adapter = useHost(createFakeWebMcpHost());
    const flaky = frontendTool();
    let throwing = true;
    const provider = createProvider({ flaky });
    mountProvider(provider, {
      filter: (_name, tool) => {
        if (tool === flaky && throwing) throw new Error("filter boom");
        return true;
      },
    });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());
    expect(adapter.registry.has("flaky")).toBe(false);

    throwing = false;
    provider.setTools({ flaky });
    await waitForNames(["flaky"]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("adds and removes registrations as the model context changes", async () => {
    const host = useHost(createFakeWebMcpHost());
    const provider = createProvider({ search: frontendTool() });
    mountProvider(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool(), alpha: frontendTool() });
    await waitForNames(["alpha", "search"]);

    provider.setTools({ alpha: frontendTool() });
    await waitForNames(["alpha"]);
    expect(host.unregisterCalls).toEqual(["search"]);
    expect(host.registerCalls).toEqual(["search", "alpha"]);
  });

  it("keeps one registration across an implementation change and calls through to the latest tool", async () => {
    const host = useHost(createFakeWebMcpHost());
    const provider = createProvider({
      search: frontendTool({ execute: async () => "first" }),
    });
    mountProvider(provider);
    await waitForNames(["search"]);

    const descriptor = host.registry.get("search")!;
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
    expect(host.registerCalls).toEqual(["search"]);
    expect(host.unregisterCalls).toEqual([]);
  });

  it("re-registers when the description or the schema changes", async () => {
    const host = useHost(createFakeWebMcpHost());
    const provider = createProvider({ search: frontendTool() });
    mountProvider(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool({ description: "renamed" }) });
    await vi.waitFor(() =>
      expect(host.registry.get("search")?.description).toBe("renamed"),
    );
    expect(host.registerCalls).toEqual(["search", "search"]);
    expect(host.unregisterCalls).toEqual(["search"]);
    expect(providerResult().registeredToolNames).toEqual(["search"]);
  });

  it("re-registers when a description is mutated on the same tool object", async () => {
    const host = useHost(createFakeWebMcpHost());
    const tool = frontendTool();
    const provider = createProvider({ search: tool });
    mountProvider(provider);
    await waitForNames(["search"]);

    (tool as { description: string }).description = "renamed in place";
    provider.setTools({ search: tool });

    await vi.waitFor(() =>
      expect(host.registry.get("search")?.description).toBe("renamed in place"),
    );
    expect(host.registerCalls).toEqual(["search", "search"]);
    expect(host.unregisterCalls).toEqual(["search"]);
  });

  it("does not observe a schema mutated in place on the same tool object", async () => {
    const adapter = useHost(createFakeWebMcpHost());
    const tool = frontendTool();
    const provider = createProvider({ search: tool });
    mountProvider(provider);
    await waitForNames(["search"]);
    const before = adapter.registry.get("search")?.inputSchema;

    (tool.parameters as Record<string, unknown>)["properties"] = {
      city: { type: "string" },
    };
    provider.setTools({ search: tool });
    await vi.waitFor(() => expect(adapter.registerCalls).toEqual(["search"]));

    expect(adapter.registry.get("search")?.inputSchema).toBe(before);
    expect(adapter.unregisterCalls).toEqual([]);
  });

  it("does not treat a tool named after an Object.prototype key as inherited", async () => {
    const host = useHost(createFakeWebMcpHost());
    const provider = createProvider({
      constructor: frontendTool({ description: "ctor" }),
      toString: frontendTool({ description: "str" }),
    });
    mountProvider(provider);

    await waitForNames(["constructor", "toString"]);
    expect(host.registry.get("constructor")?.description).toBe("ctor");

    provider.setTools({ constructor: frontendTool({ description: "ctor" }) });
    await waitForNames(["constructor"]);
    expect(host.unregisterCalls).toEqual(["toString"]);
    expect(host.registerCalls).toEqual(["constructor", "toString"]);
  });

  it("unregisters everything on unmount and warns when a disposer throws", async () => {
    const warn = silenceWarnings();
    const host = useHost(createFakeWebMcpHost());
    const { view } = mountProvider(
      createProvider({ search: frontendTool(), alpha: frontendTool() }),
    );
    await waitForNames(["alpha", "search"]);

    view.unmount();
    expect(host.registry.size).toBe(0);
    expect(host.unregisterCalls.sort()).toEqual(["alpha", "search"]);
    expect(warn).not.toHaveBeenCalled();

    useHost({
      ...createFakeWebMcpHost(),
      registerTool: () => () => {
        throw new Error("dispose boom");
      },
    });
    const second = mountProvider(createProvider({ search: frontendTool() }));
    await waitForNames(["search"]);
    second.view.unmount();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Unregistering WebMCP tool"),
      expect.any(Error),
    );
  });

  it("warns and skips a name registerTool synchronously refuses", async () => {
    const warn = silenceWarnings();
    const host = useHost(createFakeWebMcpHost());
    host.registry.set("search", {} as WebMcpToolDescriptor);

    mountProvider(
      createProvider({ search: frontendTool(), alpha: frontendTool() }),
    );

    await waitForNames(["alpha"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("registerTool failed"),
      expect.any(Error),
    );
    expect(host.registry.get("search")).toEqual({});
  });

  it("warns once for a refused name and stops retrying it until it leaves the model context", async () => {
    const warn = silenceWarnings();
    const host = useHost(createFakeWebMcpHost());
    host.registry.set("search", {} as WebMcpToolDescriptor);
    const attempts = vi.spyOn(host, "registerTool");

    const provider = createProvider({ search: frontendTool() });
    mountProvider(provider);
    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());

    for (let i = 0; i < 10; i++) {
      provider.setTools({ search: frontendTool({ description: `v${i}` }) });
    }
    await vi.waitFor(() =>
      expect(providerResult().registeredToolNames).toEqual([]),
    );
    expect(warn).toHaveBeenCalledOnce();
    expect(attempts).toHaveBeenCalledOnce();

    host.registry.delete("search");
    provider.setTools({ alpha: frontendTool() });
    await waitForNames(["alpha"]);
    provider.setTools({ alpha: frontendTool(), search: frontendTool() });
    await waitForNames(["alpha", "search"]);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("does not re-serialize schemas when an inline filter changes identity", async () => {
    useHost(createFakeWebMcpHost());
    let schemaReads = 0;
    const tool = frontendTool();
    Object.defineProperty(tool, "parameters", {
      get: () => {
        schemaReads++;
        return { type: "object", properties: {} };
      },
    });

    const { rerender } = mountProvider(createProvider({ search: tool }), {
      filter: () => true,
    });
    await waitForNames(["search"]);
    const afterMount = schemaReads;

    for (let i = 0; i < 5; i++) rerender({ filter: () => true });
    await waitForNames(["search"]);
    expect(schemaReads).toBe(afterMount);
  });

  it("holds a single live registration under StrictMode", async () => {
    const host = useHost(createFakeWebMcpHost());
    mountProvider(createProvider({ search: frontendTool() }), {}, strict);

    await waitForNames(["search"]);
    expect([...host.registry.keys()]).toEqual(["search"]);
    expect(providerResult().status).toBe("active");
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

    mountProvider(createProvider({ search: frontendTool() }));

    await vi.waitFor(() =>
      expect(providerResult().registeredToolNames).toEqual([]),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('tool "search" failed'),
      expect.any(Error),
    );
    expect(registry.get("search")).toEqual({ name: "search" });
  });

  it("names the permissions policy when the host refuses with NotAllowedError", async () => {
    const warn = silenceWarnings();
    let reject!: (error: unknown) => void;
    useHost({
      available: true,
      registerTool: (_def, onError) => {
        reject = (error) => onError?.(error);
        return () => {};
      },
    });
    mountProvider(createProvider({ search: frontendTool() }));
    await waitForNames(["search"]);

    const denied = new Error("denied");
    denied.name = "NotAllowedError";
    reject(denied);

    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("tools permission is disabled"),
        denied,
      ),
    );
    await waitForNames([]);
  });

  it("keeps the tool exposed across a description change on an async unregisterTool", async () => {
    const registry = createAsyncModelContext();
    const provider = createProvider({ search: frontendTool() });
    mountProvider(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool({ description: "renamed" }) });
    await vi.waitFor(() =>
      expect(registry.get("search")?.description).toBe("renamed"),
    );
    await Promise.resolve();
    expect(registry.get("search")?.description).toBe("renamed");
    expect(providerResult().registeredToolNames).toEqual(["search"]);
  });

  it("ignores a late failure reported by a replaced registration", async () => {
    const warn = silenceWarnings();
    const calls: {
      def: WebMcpToolDescriptor;
      onError?: (error: unknown) => void;
      dispose: ReturnType<typeof vi.fn>;
    }[] = [];
    useHost({
      available: true,
      registerTool: (def, onError) => {
        const dispose = vi.fn();
        calls.push({ def, onError, dispose });
        return dispose;
      },
    });

    const provider = createProvider({ search: frontendTool() });
    mountProvider(provider);
    await waitForNames(["search"]);

    provider.setTools({ search: frontendTool({ description: "renamed" }) });
    await vi.waitFor(() => expect(calls).toHaveLength(2));

    calls[0]!.onError?.(new Error("late failure"));

    expect(providerResult().registeredToolNames).toEqual(["search"]);
    expect(calls[1]!.dispose).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
