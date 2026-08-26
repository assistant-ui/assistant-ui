// @vitest-environment jsdom

import { useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { ModelContext } from "@assistant-ui/core/store";
import type { ModelContextProvider } from "@assistant-ui/core";
import type { Tool } from "assistant-stream";
import { createFakeWebMcpAdapter } from "./webmcp-adapter.fake";
import { WebMcpBridge } from "./WebMcpBridge";
import { useWebMcpApprovals } from "./useWebMcpApprovals";
import type { WebMcpPendingApproval } from "./approval-gate";
import type { WebMcpBridgeOptions } from "./useWebMcpBridge";

const searchTool: Tool<any, any> = {
  type: "frontend",
  description: "search things",
  parameters: { type: "object", properties: {} },
  execute: async () => "found",
} as Tool<any, any>;

const provider: ModelContextProvider = {
  getModelContext: () => ({ tools: { bridge_search: searchTool } }),
};

const Registrar = () => {
  const aui = useAui();
  useEffect(() => aui.modelContext.register(provider), [aui]);
  return null;
};

let approvals: readonly WebMcpPendingApproval[];

const ApprovalsProbe = () => {
  approvals = useWebMcpApprovals();
  return null;
};

const Harness = ({ options }: { options: WebMcpBridgeOptions }) => (
  <AuiProvider config={AuiConfig({ modelContext: ModelContext() } as never)}>
    <Registrar />
    <WebMcpBridge {...options} />
    <ApprovalsProbe />
  </AuiProvider>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WebMcpBridge", () => {
  it("renders nothing and registers the model context tools", async () => {
    const adapter = createFakeWebMcpAdapter();
    const view = render(<Harness options={{ adapter }} />);

    await vi.waitFor(() =>
      expect(adapter.registry.has("bridge_search")).toBe(true),
    );
    expect(view.container.innerHTML).toBe("");

    view.unmount();
    expect(adapter.registry.size).toBe(0);
  });

  it("gates WebMCP-invoked execution behind a pending approval", async () => {
    const adapter = createFakeWebMcpAdapter();
    render(<Harness options={{ adapter }} />);
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
    const adapter = createFakeWebMcpAdapter();
    render(<Harness options={{ adapter }} />);
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
    const adapter = createFakeWebMcpAdapter();
    render(<Harness options={{ adapter, approval: "never" }} />);
    await vi.waitFor(() =>
      expect(adapter.registry.has("bridge_search")).toBe(true),
    );

    await expect(
      adapter.registry.get("bridge_search")!.execute({}),
    ).resolves.toEqual({ content: [{ type: "text", text: "found" }] });
    expect(approvals).toEqual([]);
  });
});
