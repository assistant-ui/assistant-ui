import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  remove: vi.fn<() => Promise<void>>(),
}));

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({ mcpServer: { remove: mocks.remove } }),
  useAuiState: () => "custom",
}));

vi.mock("@radix-ui/react-primitive", () => ({
  Primitive: { button: "button" },
}));

const { McpServerPrimitiveRemoveButton } =
  await import("./McpServerRemoveButton");

const renderButton = () =>
  (
    McpServerPrimitiveRemoveButton as unknown as {
      render: (
        props: Record<string, unknown>,
        ref: null,
      ) => {
        props: {
          onClick: (event: { defaultPrevented: boolean }) => void;
        };
      };
    }
  ).render({}, null);

describe("McpServerPrimitiveRemoveButton", () => {
  beforeEach(() => {
    mocks.remove.mockReset();
  });

  it("reports rejected remove actions", async () => {
    const error = new Error("storage unavailable");
    mocks.remove.mockRejectedValueOnce(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    renderButton().props.onClick({ defaultPrevented: false });

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui/react-mcp] failed to remove MCP server:",
        error,
      );
    });
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});
