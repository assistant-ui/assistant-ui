import { describe, it, expect, vi } from "vitest";

const { mockUseAuiState } = vi.hoisted(() => ({ mockUseAuiState: vi.fn() }));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: ((selector: (s: unknown) => unknown) =>
    mockUseAuiState(
      selector,
    )) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useMessageError } from "./useMessageError";

const against = (message: unknown) =>
  mockUseAuiState.mockImplementationOnce((selector: (s: unknown) => unknown) =>
    selector({ message }),
  );

describe("useMessageError", () => {
  it("returns the message from a structured AssistantError", () => {
    against({
      status: {
        type: "incomplete",
        reason: "error",
        error: { code: "network", message: "offline" },
      },
    });
    expect(useMessageError()).toBe("offline");
  });

  it("passes a legacy string error through", () => {
    against({
      status: {
        type: "incomplete",
        reason: "error",
        error: "legacy failure",
      },
    });
    expect(useMessageError()).toBe("legacy failure");
  });

  it("returns message from an object that fails the full guard", () => {
    against({
      status: {
        type: "incomplete",
        reason: "error",
        error: {
          code: "unknown",
          message: "foreign severity stream",
          severity: "fatal",
        },
      },
    });
    expect(useMessageError()).toBe("foreign severity stream");
  });

  it("returns undefined when there is no error status", () => {
    against({
      status: { type: "complete", reason: "stop" },
    });
    expect(useMessageError()).toBeUndefined();
  });
});
