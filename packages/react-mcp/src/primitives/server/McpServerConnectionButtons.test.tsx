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

  it("handles rejected connect actions", () => {
    const action = Promise.reject(new Error("connection failed"));
    const catchSpy = vi.spyOn(action, "catch");
    void action.then(undefined, () => undefined);
    mocks.connect.mockReturnValueOnce(action);

    renderButton(McpServerPrimitiveConnectButton)?.props.onClick({
      defaultPrevented: false,
    });

    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(catchSpy).toHaveBeenCalledOnce();
  });

  it("handles rejected disconnect actions", () => {
    mocks.connectionState = "connected";
    const action = Promise.reject(new Error("cleanup failed"));
    const catchSpy = vi.spyOn(action, "catch");
    void action.then(undefined, () => undefined);
    mocks.disconnect.mockReturnValueOnce(action);

    renderButton(McpServerPrimitiveDisconnectButton)?.props.onClick({
      defaultPrevented: false,
    });

    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(catchSpy).toHaveBeenCalledOnce();
  });
});
