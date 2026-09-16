// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  speak: vi.fn(),
  state: {
    thread: { capabilities: { speech: true } },
    message: {
      role: "assistant",
      status: { type: "complete", reason: "stop" },
      parts: [{ type: "text", text: "Hello" }],
    },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({ message: { speak: mocks.speak } }),
  useAuiState: (selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}));

import { useActionBarSpeak } from "./useActionBarSpeak";

afterEach(() => {
  cleanup();
  mocks.speak.mockReset();
  mocks.state.thread.capabilities.speech = true;
});

describe("useActionBarSpeak", () => {
  it("disables speaking when the runtime has no speech adapter", () => {
    mocks.state.thread.capabilities.speech = false;

    const { result } = renderHook(() => useActionBarSpeak());

    expect(result.current.disabled).toBe(true);
  });

  it("enables speaking for completed text when speech is supported", () => {
    const { result } = renderHook(() => useActionBarSpeak());

    expect(result.current.disabled).toBe(false);
  });

  it("invokes speech synchronously", () => {
    const { result } = renderHook(() => useActionBarSpeak());

    expect(result.current.speak()).toBeUndefined();
    expect(mocks.speak).toHaveBeenCalledOnce();
  });
});
