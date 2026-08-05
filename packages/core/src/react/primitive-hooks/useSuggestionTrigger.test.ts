/** @vitest-environment jsdom */
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const append = vi.fn();
  const setText = vi.fn();

  const state = {
    thread: {
      isDisabled: false,
      isRunning: false,
      capabilities: { queue: false },
    },
  };
  const composerState = {
    text: "",
    runConfig: { custom: { model: "gpt-test" } },
  };

  return {
    append,
    setText,
    state,
    composerState,
    aui: {
      thread: {
        getState: () => state.thread,
        append,
      },
      composer: {
        getState: () => composerState,
        setText,
      },
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: ((selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state)) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useSuggestionTrigger } from "./useSuggestionTrigger";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.state.thread.isDisabled = false;
  mocks.state.thread.isRunning = false;
  mocks.state.thread.capabilities = { queue: false };
  mocks.composerState.text = "";
});

describe("useSuggestionTrigger", () => {
  it("appends the prompt and clears the composer when sending while idle", () => {
    const { result } = renderHook(() =>
      useSuggestionTrigger({ prompt: "Hello", send: true }),
    );

    result.current.trigger();

    expect(result.current.disabled).toBe(false);
    expect(mocks.append).toHaveBeenCalledWith({
      content: [{ type: "text", text: "Hello" }],
      runConfig: { custom: { model: "gpt-test" } },
    });
    expect(mocks.setText).toHaveBeenCalledWith("");
  });

  it("disables and no-ops when sending while running without queue support", () => {
    mocks.state.thread.isRunning = true;
    mocks.composerState.text = "my draft";
    const { result } = renderHook(() =>
      useSuggestionTrigger({ prompt: "Hello", send: true }),
    );

    result.current.trigger();

    expect(result.current.disabled).toBe(true);
    expect(mocks.append).not.toHaveBeenCalled();
    expect(mocks.setText).not.toHaveBeenCalled();
  });

  it("queues without touching the composer while running when the thread supports queueing", () => {
    mocks.state.thread.isRunning = true;
    mocks.state.thread.capabilities = { queue: true };
    mocks.composerState.text = "my draft";
    const { result } = renderHook(() =>
      useSuggestionTrigger({ prompt: "Hello", send: true }),
    );

    result.current.trigger();

    expect(result.current.disabled).toBe(false);
    expect(mocks.append).toHaveBeenCalledWith({
      content: [{ type: "text", text: "Hello" }],
      runConfig: { custom: { model: "gpt-test" } },
    });
    expect(mocks.setText).not.toHaveBeenCalled();
  });

  it("replaces the composer text when send is false, even while running", () => {
    mocks.state.thread.isRunning = true;
    mocks.composerState.text = "my draft";
    const { result } = renderHook(() =>
      useSuggestionTrigger({ prompt: "Hello" }),
    );

    result.current.trigger();

    expect(result.current.disabled).toBe(false);
    expect(mocks.append).not.toHaveBeenCalled();
    expect(mocks.setText).toHaveBeenCalledWith("Hello");
  });

  it("appends to the composer text when clearComposer is false", () => {
    mocks.composerState.text = "my draft";
    const { result } = renderHook(() =>
      useSuggestionTrigger({ prompt: "Hello", clearComposer: false }),
    );

    result.current.trigger();

    expect(mocks.setText).toHaveBeenCalledWith("my draft Hello");
  });

  it("inserts the prompt alone when the composer is empty and clearComposer is false", () => {
    const { result } = renderHook(() =>
      useSuggestionTrigger({ prompt: "Hello", clearComposer: false }),
    );

    result.current.trigger();

    expect(mocks.setText).toHaveBeenCalledWith("Hello");
  });

  it("disables when the thread is disabled", () => {
    mocks.state.thread.isDisabled = true;
    const { result } = renderHook(() =>
      useSuggestionTrigger({ prompt: "Hello" }),
    );

    expect(result.current.disabled).toBe(true);
  });
});
