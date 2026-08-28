// @vitest-environment jsdom

import { StrictMode, useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
import type { ModelContextProvider } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import { createFakeWebMcpAdapter } from "./webmcp-adapter.fake";
import type { WebMcpAdapter } from "./webmcp-adapter";
import {
  webMcpApprovalStore,
  type WebMcpPendingApproval,
} from "./approval-gate";
import { useWebMcpApprovals } from "./useWebMcpApprovals";
import {
  useWebMcpBridge,
  type WebMcpBridgeOptions,
  type WebMcpBridgeResult,
} from "./useWebMcpBridge";

const { adapterRef } = vi.hoisted(() => ({
  adapterRef: { current: null as WebMcpAdapter | null },
}));

vi.mock("./webmcp-adapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./webmcp-adapter")>()),
  getDefaultWebMcpAdapter: (): WebMcpAdapter =>
    adapterRef.current ?? { available: false, registerTool: () => () => {} },
}));

const useAdapter = <T extends WebMcpAdapter>(adapter: T): T => {
  adapterRef.current = adapter;
  return adapter;
};

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
let approvals: readonly WebMcpPendingApproval[];

const Probe = ({ options }: { options: WebMcpBridgeOptions }) => {
  latest = useWebMcpBridge(options);
  return null;
};

const ApprovalsProbe = () => {
  approvals = useWebMcpApprovals();
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
    <ApprovalsProbe />
  </AuiProvider>
);

const waitForApproval = (toolName: string) =>
  vi.waitFor(() => {
    const pending = webMcpApprovalStore
      .getSnapshot()
      .find((approval) => approval.toolName === toolName);
    if (!pending) throw new Error(`no pending approval for "${toolName}"`);
    return pending;
  });

afterEach(() => {
  cleanup();
  for (const pending of webMcpApprovalStore.getSnapshot()) {
    try {
      pending.respond({ approved: false });
    } catch {
      /* already settled */
    }
  }
  adapterRef.current = null;
  vi.restoreAllMocks();
});

describe("useWebMcpBridge", () => {
  it("registers filtered tools on mount and reports them", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({
      search: searchTool,
      server: backendTool,
      off: { ...searchTool, disabled: true } as Tool<any, any>,
    });

    render(<Harness provider={provider} options={{}} />);

    await vi.waitFor(() => {
      expect([...adapter.registry.keys()]).toEqual(["search"]);
    });
    expect(latest.status).toBe("active");
    expect(latest.registeredToolNames).toEqual(["search"]);
    expect(adapter.registry.get("search")?.description).toBe("search things");
  });

  it("re-syncs when the model context changes", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{}} />);
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
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{}} />);
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
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{}} />);
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));
    const registerCount = adapter.registerCalls.length;

    act(() => {
      provider.setTools({ search: searchTool });
    });

    expect(adapter.registerCalls.length).toBe(registerCount);
    expect(adapter.unregisterCalls).toEqual([]);
  });

  it("unregisters everything on unmount", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: searchTool });

    const view = render(<Harness provider={provider} options={{}} />);
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));

    view.unmount();
    expect(adapter.registry.size).toBe(0);
    expect(adapter.unregisterCalls).toContain("search");
  });

  it("is StrictMode-safe: the double-invoked effect leaves one live registration", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: searchTool });

    const view = render(
      <StrictMode>
        <Harness provider={provider} options={{}} />
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
    const adapter = useAdapter(createFakeWebMcpAdapter({ available: false }));
    const provider = createProvider({ search: searchTool });

    render(<Harness provider={provider} options={{}} />);

    await act(async () => {});
    expect(latest.status).toBe("unsupported");
    expect(latest.registeredToolNames).toEqual([]);
    expect(adapter.registerCalls).toEqual([]);
  });

  it("routes calls to the latest execute when metadata is unchanged", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const first = vi.fn(async () => "first");
    const second = vi.fn(async () => "second");
    const provider = createProvider({
      search: { ...searchTool, execute: first } as Tool<any, any>,
    });

    render(<Harness provider={provider} options={{ approval: "never" }} />);
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));
    const registerCount = adapter.registerCalls.length;

    act(() => {
      provider.setTools({
        search: { ...searchTool, execute: second } as Tool<any, any>,
      });
    });

    expect(adapter.registerCalls.length).toBe(registerCount);
    const result = await adapter.registry.get("search")!.execute({});
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(result).toEqual({ content: [{ type: "text", text: "second" }] });
  });

  it("re-syncs when the filter changes identity without a registry notification", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const otherTool: Tool<any, any> = {
      ...searchTool,
      description: "other",
    } as Tool<any, any>;
    const provider = createProvider({ search: searchTool, other: otherTool });

    const view = render(
      <Harness provider={provider} options={{ filter: () => true }} />,
    );
    await vi.waitFor(() => expect(adapter.registry.size).toBe(2));

    view.rerender(
      <Harness
        provider={provider}
        options={{ filter: (name) => name !== "other" }}
      />,
    );

    await vi.waitFor(() => expect(adapter.registry.has("other")).toBe(false));
    expect(adapter.registry.has("search")).toBe(true);
    expect(latest.registeredToolNames).toEqual(["search"]);
  });

  it("drops a registration whose promise-based registerTool later fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useAdapter<WebMcpAdapter>({
      available: true,
      registerTool: (def, onError) => {
        if (def.name === "search") {
          queueMicrotask(() => onError?.(new Error("taken")));
        }
        return () => {};
      },
    });
    const otherTool: Tool<any, any> = {
      ...searchTool,
      description: "other",
    } as Tool<any, any>;
    const provider = createProvider({ search: searchTool, other: otherTool });

    render(<Harness provider={provider} options={{}} />);

    await vi.waitFor(() =>
      expect(latest.registeredToolNames).toEqual(["other"]),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"search"'),
      expect.anything(),
    );
  });

  it("warns and skips a tool whose filter throws while registering the rest", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const otherTool: Tool<any, any> = {
      ...searchTool,
      description: "other",
    } as Tool<any, any>;
    const provider = createProvider({ search: searchTool, other: otherTool });

    render(
      <Harness
        provider={provider}
        options={{
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
    const adapter = useAdapter(
      createFakeWebMcpAdapter({ withEnumeration: true }),
    );
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

    render(<Harness provider={provider} options={{}} />);

    await vi.waitFor(() => expect(adapter.registry.has("other")).toBe(true));
    expect(adapter.registerCalls).toEqual(["other"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"search"'));
    expect(latest.registeredToolNames).toEqual(["other"]);
  });

  it("does not tear down registrations when inline options change identity every render", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ search: searchTool });

    const view = render(
      <Harness
        provider={provider}
        options={{ filter: () => true, approval: "always" }}
      />,
    );
    await vi.waitFor(() => expect(adapter.registry.has("search")).toBe(true));
    const registerCount = adapter.registerCalls.length;

    view.rerender(
      <Harness
        provider={provider}
        options={{ filter: () => true, approval: "always" }}
      />,
    );

    await act(async () => {});
    expect(adapter.registerCalls.length).toBe(registerCount);
    expect(adapter.unregisterCalls).toEqual([]);
  });

  it("warns and skips on a name collision without touching the app's registration", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const adapter = useAdapter(createFakeWebMcpAdapter());
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

    const view = render(<Harness provider={provider} options={{}} />);

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

describe("useWebMcpBridge approvals", () => {
  it("gates a WebMCP-invoked execution behind a pending approval", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ bridge_search: searchTool });
    render(<Harness provider={provider} options={{}} />);
    await vi.waitFor(() =>
      expect(adapter.registry.has("bridge_search")).toBe(true),
    );

    let result!: Promise<unknown>;
    act(() => {
      result = adapter.registry.get("bridge_search")!.execute({ q: "cats" });
    });

    await vi.waitFor(() => expect(approvals).toHaveLength(1));
    expect(approvals[0]!.toolName).toBe("bridge_search");

    await act(async () => {
      approvals[0]!.respond({ optionId: "allow-once" });
    });
    await expect(result).resolves.toEqual({
      content: [{ type: "text", text: "found" }],
    });
    expect(approvals).toEqual([]);
  });

  it("returns a declined error result when the approval is rejected", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ bridge_search: searchTool });
    render(<Harness provider={provider} options={{}} />);
    await vi.waitFor(() =>
      expect(adapter.registry.has("bridge_search")).toBe(true),
    );

    let result!: Promise<unknown>;
    act(() => {
      result = adapter.registry.get("bridge_search")!.execute({});
    });
    await vi.waitFor(() => expect(approvals).toHaveLength(1));

    await act(async () => {
      approvals[0]!.respond({ optionId: "reject-once", reason: "not now" });
    });
    await expect(result).resolves.toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: 'User declined tool call "bridge_search": not now',
        },
      ],
    });
  });

  it('skips the approval queue with approval: "never"', async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const provider = createProvider({ bridge_search: searchTool });
    render(<Harness provider={provider} options={{ approval: "never" }} />);
    await vi.waitFor(() =>
      expect(adapter.registry.has("bridge_search")).toBe(true),
    );

    await expect(
      adapter.registry.get("bridge_search")!.execute({}),
    ).resolves.toEqual({ content: [{ type: "text", text: "found" }] });
    expect(approvals).toEqual([]);
  });

  it("re-prompts for a tool re-registered under a name that was granted allow-always", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const benign = vi.fn(async () => "benign");
    const provider = createProvider({
      swap: { ...searchTool, execute: benign } as Tool<any, any>,
    });
    render(<Harness provider={provider} options={{}} />);
    await vi.waitFor(() => expect(adapter.registry.has("swap")).toBe(true));

    const granted = adapter.registry.get("swap")!.execute({});
    const first = await waitForApproval("swap");
    await act(async () => {
      first.respond({ optionId: "allow-always" });
    });
    await granted;

    const repeat = adapter.registry.get("swap")!.execute({});
    await expect(repeat).resolves.toEqual({
      content: [{ type: "text", text: "benign" }],
    });

    const dangerous = vi.fn(async () => "danger");
    act(() => {
      provider.setTools({
        swap: {
          ...searchTool,
          description: "totally different now",
          execute: dangerous,
        } as Tool<any, any>,
      });
    });
    await vi.waitFor(() =>
      expect(adapter.registry.get("swap")?.description).toBe(
        "totally different now",
      ),
    );

    const afterSwap = adapter.registry.get("swap")!.execute({});
    const second = await waitForApproval("swap");
    expect(dangerous).not.toHaveBeenCalled();

    await act(async () => {
      second.respond({ optionId: "reject-once" });
    });
    await expect(afterSwap).resolves.toMatchObject({ isError: true });
    expect(dangerous).not.toHaveBeenCalled();
  });

  it("cancels a pending approval when the tool is unregistered", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const execute = vi.fn(async () => "ran");
    const provider = createProvider({
      pending: { ...searchTool, execute } as Tool<any, any>,
    });
    render(<Harness provider={provider} options={{}} />);
    await vi.waitFor(() => expect(adapter.registry.has("pending")).toBe(true));

    const call = adapter.registry.get("pending")!.execute({});
    await waitForApproval("pending");

    await act(async () => {
      provider.setTools({});
    });
    await vi.waitFor(() => expect(adapter.registry.has("pending")).toBe(false));

    await expect(call).resolves.toEqual({
      isError: true,
      content: [
        { type: "text", text: 'Tool call approval for "pending" cancelled' },
      ],
    });
    expect(
      webMcpApprovalStore
        .getSnapshot()
        .some((approval) => approval.toolName === "pending"),
    ).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it("refuses a call on a descriptor captured before the tool was unregistered", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    const execute = vi.fn(async () => "still ran");
    const provider = createProvider({
      stale: { ...searchTool, execute } as Tool<any, any>,
    });
    render(<Harness provider={provider} options={{ approval: "never" }} />);
    await vi.waitFor(() => expect(adapter.registry.has("stale")).toBe(true));

    const descriptor = adapter.registry.get("stale")!;
    act(() => {
      provider.setTools({});
    });
    await vi.waitFor(() => expect(adapter.registry.has("stale")).toBe(false));

    await expect(descriptor.execute({})).resolves.toEqual({
      isError: true,
      content: [{ type: "text", text: 'Tool "stale" is no longer registered' }],
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("resolves concurrent calls to one tool independently", async () => {
    const adapter = useAdapter(createFakeWebMcpAdapter());
    let n = 0;
    const provider = createProvider({
      conc: { ...searchTool, execute: async () => `r${n++}` } as Tool<any, any>,
    });
    render(<Harness provider={provider} options={{ approval: "never" }} />);
    await vi.waitFor(() => expect(adapter.registry.has("conc")).toBe(true));

    const descriptor = adapter.registry.get("conc")!;
    const results = await Promise.all([
      descriptor.execute({}),
      descriptor.execute({}),
      descriptor.execute({}),
    ]);

    expect(
      results.map((result) => (result.content[0] as { text: string }).text),
    ).toEqual(["r0", "r1", "r2"]);
  });
});
