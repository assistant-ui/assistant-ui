import type { AssistantState } from "@assistant-ui/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  remove: vi.fn<() => Promise<void>>(),
  kind: "custom" as "connector" | "custom",
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal()),
  useAui: () => ({ mcpServer: { remove: mocks.remove } }),
  useAuiState: function useAuiState<T>(selector: (state: AssistantState) => T) {
    return selector({
      mcpServer: { kind: mocks.kind },
    } as AssistantState);
  },
}));

const { McpServerPrimitiveRemoveButton } =
  await import("./McpServerRemoveButton");

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
    mocks.kind = "custom";
  });

  it("does not render for connectors", () => {
    mocks.kind = "connector";

    expect(renderButton()).toBeNull();
  });

  it("handles rejected custom server remove actions", async () => {
    mocks.remove.mockRejectedValueOnce(new Error("storage unavailable"));

    const unhandledRejections = await captureUnhandledRejections(() => {
      renderButton().props.onClick({ defaultPrevented: false });
    });

    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(unhandledRejections).toEqual([]);
  });
});
