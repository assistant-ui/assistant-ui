import type { AssistantState } from "@assistant-ui/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn<() => Promise<void>>(),
  connectionState: "disconnected" as
    | "disconnected"
    | "connected"
    | "connecting"
    | "authPending"
    | "authRequired"
    | "error",
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({
    mcpServer: {
      connect: mocks.connect,
      disconnect: mocks.disconnect,
    },
  }),
  useAuiState: function useAuiState<T>(selector: (state: AssistantState) => T) {
    return selector({
      mcpServer: { connectionState: mocks.connectionState },
    } as AssistantState);
  },
}));

const { McpServerPrimitiveConnectButton } =
  await import("./McpServerConnectButton");
const { McpServerPrimitiveDisconnectButton } =
  await import("./McpServerDisconnectButton");

const captureUnhandledRejections = async (callback: () => void) => {
  const reasons: unknown[] = [];
  const listener = (reason: unknown) => reasons.push(reason);
  process.on("unhandledRejection", listener);
  try {
    callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return reasons;
  } finally {
    process.off("unhandledRejection", listener);
  }
};

type Button = {
  props: {
    onClick: (event: { defaultPrevented: boolean }) => void;
  };
};

const renderButton = (component: unknown): Button | null =>
  (
    component as {
      render: (props: Record<string, unknown>, ref: null) => Button | null;
    }
  ).render({}, null);

describe("MCP server connection buttons", () => {
  beforeEach(() => {
    mocks.connect.mockReset();
    mocks.disconnect.mockReset();
    mocks.connectionState = "disconnected";
  });

  it("renders only the connect action while disconnected", () => {
    expect(renderButton(McpServerPrimitiveConnectButton)).not.toBeNull();
    expect(renderButton(McpServerPrimitiveDisconnectButton)).toBeNull();
  });

  it("renders only the disconnect action while connected", () => {
    mocks.connectionState = "connected";

    expect(renderButton(McpServerPrimitiveConnectButton)).toBeNull();
    expect(renderButton(McpServerPrimitiveDisconnectButton)).not.toBeNull();
  });

  it("handles rejected connect actions", async () => {
    mocks.connect.mockRejectedValueOnce(new Error("connection failed"));

    const unhandledRejections = await captureUnhandledRejections(() => {
      renderButton(McpServerPrimitiveConnectButton)!.props.onClick({
        defaultPrevented: false,
      });
    });

    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(unhandledRejections).toEqual([]);
  });

  it("handles rejected disconnect actions", async () => {
    mocks.connectionState = "connected";
    mocks.disconnect.mockRejectedValueOnce(new Error("cleanup failed"));

    const unhandledRejections = await captureUnhandledRejections(() => {
      renderButton(McpServerPrimitiveDisconnectButton)!.props.onClick({
        defaultPrevented: false,
      });
    });

    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(unhandledRejections).toEqual([]);
  });
});
