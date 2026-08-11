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

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useCallback: (<T>(fn: T): T => fn) as typeof import("react").useCallback,
}));

import type { AppendMessage } from "@assistant-ui/core";
import { agUiExtras } from "../src/agUiExtras";
import {
  useAgUiInterrupts,
  useAgUiSendA2uiAction,
  useAgUiSubmitInterruptResponses,
  useAgUiSteerAway,
} from "../src/hooks";
import type { AgUiInterrupt, AgUiResumeEntry } from "../src/runtime/types";

const interrupt: AgUiInterrupt = { id: "int-1", reason: "confirmation" };

const userMessage: AppendMessage = {
  role: "user",
  content: [{ type: "text", text: "hi" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  parentId: null,
  sourceId: null,
  runConfig: {},
};

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
        steerAway: vi.fn(),
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
      steerAway: vi.fn(),
    });
    mockUseAui.mockReturnValue({
      thread: { getState: () => ({ extras }) },
    });
    const responses: AgUiResumeEntry[] = [
      { interruptId: "int-1", status: "cancelled" },
    ];

    useAgUiSubmitInterruptResponses()(responses);

    expect(submitInterruptResponses).toHaveBeenCalledWith(responses);
  });

  it("throws when the thread is not backed by ag-ui", () => {
    mockUseAui.mockReturnValue({
      thread: { getState: () => ({ extras: undefined }) },
    });
    expect(() => useAgUiSubmitInterruptResponses()([])).toThrow(
      "useAgUiRuntime",
    );
  });
});

describe("useAgUiSendA2uiAction", () => {
  it("delegates to extras.sendA2uiAction with the given action", () => {
    const sendA2uiAction = vi.fn();
    const extras = agUiExtras.provide({
      interrupts: [interrupt],
      sendA2uiAction,
      submitInterruptResponses: vi.fn(),
      steerAway: vi.fn(),
    });
    mockUseAui.mockReturnValue({
      thread: { getState: () => ({ extras }) },
    });
    const action = { type: "a2ui:action", name: "submit" };

    useAgUiSendA2uiAction()(action);

    expect(sendA2uiAction).toHaveBeenCalledWith(action);
  });
});

describe("useAgUiSteerAway", () => {
  it("forwards the message and responses to extras.steerAway", () => {
    const steerAway = vi.fn().mockResolvedValue(undefined);
    const extras = agUiExtras.provide({
      interrupts: [interrupt],
      submitInterruptResponses: vi.fn(),
      steerAway,
    });
    mockUseAui.mockReturnValue({
      thread: { getState: () => ({ extras }) },
    });
    const responses: AgUiResumeEntry[] = [
      { interruptId: "int-1", status: "cancelled" },
    ];

    useAgUiSteerAway()("changed my mind", responses);

    expect(steerAway).toHaveBeenCalledWith("changed my mind", responses);
  });

  it("forwards a bare message with no responses", () => {
    const steerAway = vi.fn().mockResolvedValue(undefined);
    const extras = agUiExtras.provide({
      interrupts: [interrupt],
      submitInterruptResponses: vi.fn(),
      steerAway,
    });
    mockUseAui.mockReturnValue({
      thread: { getState: () => ({ extras }) },
    });

    useAgUiSteerAway()(userMessage);

    expect(steerAway).toHaveBeenCalledWith(userMessage, undefined);
  });

  it("throws when the thread is not backed by ag-ui", () => {
    mockUseAui.mockReturnValue({
      thread: { getState: () => ({ extras: undefined }) },
    });
    expect(() => useAgUiSteerAway()(userMessage)).toThrow("useAgUiRuntime");
  });
});
