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
import {
  useAgUiInterrupts,
  useAgUiSubmitInterruptResponses,
} from "../src/hooks";
import type { AgUiInterrupt, AgUiResumeEntry } from "../src/runtime/types";

const interrupt: AgUiInterrupt = { id: "int-1", reason: "confirmation" };

const againstState = (extras: unknown) =>
  mockUseAuiState.mockImplementationOnce((selector: (s: unknown) => unknown) =>
    selector({ thread: { extras } }),
  );

describe("useAgUiInterrupts", () => {
  it("returns the pending interrupts when the thread is backed by ag-ui", () => {
    const submitInterruptResponses = vi.fn();
    againstState(
      agUiExtras.provide({
        interrupts: [interrupt],
        submitInterruptResponses,
      }),
    );
    expect(useAgUiInterrupts()).toEqual([interrupt]);
  });

  it("returns an empty array when the thread is not backed by ag-ui", () => {
    againstState(undefined);
    expect(useAgUiInterrupts()).toEqual([]);
  });
});

describe("useAgUiSubmitInterruptResponses", () => {
  it("delegates to the extras submitInterruptResponses with the given responses", () => {
    const submitInterruptResponses = vi.fn().mockResolvedValue(undefined);
    const extras = agUiExtras.provide({
      interrupts: [interrupt],
      submitInterruptResponses,
    });
    mockUseAui.mockReturnValue({
      thread: () => ({ getState: () => ({ extras }) }),
    });
    const responses: AgUiResumeEntry[] = [
      { interruptId: "int-1", status: "cancelled" },
    ];

    useAgUiSubmitInterruptResponses()(responses);

    expect(submitInterruptResponses).toHaveBeenCalledWith(responses);
  });

  it("throws when the thread is not backed by ag-ui", () => {
    mockUseAui.mockReturnValue({
      thread: () => ({ getState: () => ({ extras: undefined }) }),
    });
    expect(() => useAgUiSubmitInterruptResponses()([])).toThrow(
      "useAgUiRuntime",
    );
  });
});
