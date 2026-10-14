import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  mcpServer: {
    connectionState: "disconnected",
    lastError: null as { message: string } | null,
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: (selector: (store: typeof state) => unknown) => selector(state),
}));

import { STATUS_LABEL, useServerAnnouncement } from "./mcp-config-state";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  state.mcpServer.connectionState = "disconnected";
  state.mcpServer.lastError = null;
});

describe("useServerAnnouncement", () => {
  it("announces transitions, prioritizes new errors, then clears the message", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(() => useServerAnnouncement());
    expect(result.current).toBe("");

    state.mcpServer.connectionState = "connecting";
    rerender();
    expect(result.current).toBe(STATUS_LABEL.connecting);

    state.mcpServer.connectionState = "error";
    state.mcpServer.lastError = { message: "Connection failed" };
    rerender();
    expect(result.current).toBe("Error: Connection failed");

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe("");

    state.mcpServer.connectionState = "disconnected";
    rerender();
    expect(result.current).toBe(STATUS_LABEL.disconnected);
  });
});
