import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const append = vi.fn();
  const setText = vi.fn();

  const threadState = {
    isRunning: false,
    capabilities: { queue: false },
  };
  const composerState = {
    text: "",
    runConfig: { custom: { model: "gpt-test" } },
  };

  return {
    append,
    setText,
    threadState,
    composerState,
    state: {
      thread: {
        isDisabled: false,
      },
    },
    aui: {
      thread: {
        getState: () => threadState,
        append,
      },
      composer: {
        getState: () => composerState,
        setText,
      },
    },
  };
});

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useCallback: ((callback: unknown) =>
    callback) as typeof import("react").useCallback,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.aui,
  useAuiState: ((selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state)) as typeof import("@assistant-ui/store").useAuiState,
}));

import { useSuggestionTrigger } from "./useSuggestionTrigger";

afterEach(() => {
  vi.clearAllMocks();
  mocks.threadState.isRunning = false;
  mocks.threadState.capabilities = { queue: false };
  mocks.composerState.text = "";
});

describe("useSuggestionTrigger", () => {
  it("appends the prompt and clears the composer when sending while idle", () => {
    const { trigger } = useSuggestionTrigger({ prompt: "Hello", send: true });

    trigger();

    expect(mocks.append).toHaveBeenCalledWith({
      content: [{ type: "text", text: "Hello" }],
      runConfig: { custom: { model: "gpt-test" } },
    });
    expect(mocks.setText).toHaveBeenCalledWith("");
  });

  it("does nothing when sending while running without queue support", () => {
    mocks.threadState.isRunning = true;
    mocks.composerState.text = "my draft";
    const { trigger } = useSuggestionTrigger({ prompt: "Hello", send: true });

    trigger();

    expect(mocks.append).not.toHaveBeenCalled();
    expect(mocks.setText).not.toHaveBeenCalled();
  });

  it("appends without touching the composer while running when the thread supports queueing", () => {
    mocks.threadState.isRunning = true;
    mocks.threadState.capabilities = { queue: true };
    mocks.composerState.text = "my draft";
    const { trigger } = useSuggestionTrigger({ prompt: "Hello", send: true });

    trigger();

    expect(mocks.append).toHaveBeenCalledWith({
      content: [{ type: "text", text: "Hello" }],
      runConfig: { custom: { model: "gpt-test" } },
    });
    expect(mocks.setText).not.toHaveBeenCalled();
  });

  it("replaces the composer text when send is false", () => {
    mocks.composerState.text = "my draft";
    const { trigger } = useSuggestionTrigger({ prompt: "Hello" });

    trigger();

    expect(mocks.append).not.toHaveBeenCalled();
    expect(mocks.setText).toHaveBeenCalledWith("Hello");
  });

  it("appends to the composer text when clearComposer is false", () => {
    mocks.composerState.text = "my draft";
    const { trigger } = useSuggestionTrigger({
      prompt: "Hello",
      clearComposer: false,
    });

    trigger();

    expect(mocks.setText).toHaveBeenCalledWith("my draft Hello");
  });
});
