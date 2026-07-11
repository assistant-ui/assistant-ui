import { describe, it, expect, vi } from "vitest";

const { mockUseAuiState, mockUseAui } = vi.hoisted(() => ({
  mockUseAuiState: vi.fn(),
  mockUseAui: vi.fn(),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: ((selector: (s: unknown) => unknown) =>
    mockUseAuiState(
      selector,
    )) as typeof import("@assistant-ui/store").useAuiState,
  useAui: (() => mockUseAui()) as typeof import("@assistant-ui/store").useAui,
}));

import { agUiExtras } from "../src/agUiExtras";
import { useAgUiState, useAgUiSetState } from "../src/hooks";

const againstState = (extras: unknown) =>
  mockUseAuiState.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ thread: { extras } }),
  );

describe("useAgUiState", () => {
  it("returns state from extras when the thread is backed by ag-ui", () => {
    againstState(
      agUiExtras.provide({
        interrupts: [],
        submitInterruptResponses: vi.fn(),
        steerAway: vi.fn(),
        state: { count: 1 },
        setState: vi.fn(),
      }),
    );

    expect(useAgUiState<{ count: number }>()).toEqual({ count: 1 });
  });

  it("returns undefined state when extras are absent", () => {
    againstState(undefined);

    expect(useAgUiState()).toBeUndefined();
  });
});

describe("useAgUiSetState", () => {
  it("calls extras.setState with a value", () => {
    const setState = vi.fn();
    const extras = agUiExtras.provide({
      interrupts: [],
      submitInterruptResponses: vi.fn(),
      steerAway: vi.fn(),
      state: { count: 0 },
      setState,
    });
    againstState(extras);
    mockUseAui.mockReturnValue({
      thread: () => ({ getState: () => ({ extras }) }),
    });

    useAgUiSetState<{ count: number }>()({ count: 5 });

    expect(setState).toHaveBeenCalledWith({ count: 5 });
  });

  it("resolves a functional updater against the current extras state", () => {
    const setState = vi.fn();
    const extras = agUiExtras.provide({
      interrupts: [],
      submitInterruptResponses: vi.fn(),
      steerAway: vi.fn(),
      state: { count: 2 },
      setState,
    });
    againstState(extras);
    mockUseAui.mockReturnValue({
      thread: () => ({ getState: () => ({ extras }) }),
    });

    useAgUiSetState<{ count: number }>()((prev) => ({
      count: (prev?.count ?? 0) + 1,
    }));

    expect(setState).toHaveBeenCalledWith({ count: 3 });
  });
});
