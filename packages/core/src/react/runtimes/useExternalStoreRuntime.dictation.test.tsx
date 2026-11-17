// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { useAuiState } from "@assistant-ui/store";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import type { DictationAdapter } from "../../adapters/speech";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useComposerDictate } from "../primitive-hooks/useComposerDictate";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

afterEach(cleanup);

describe("useExternalStoreRuntime dictation", () => {
  it("shows why dictation ended until the next session starts", async () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    let status: DictationAdapter.Status = { type: "running" };
    const listen = vi.fn((): DictationAdapter.Session => ({
      get status() {
        return status;
      },
      stop: async () => {},
      cancel: () => {},
      onSpeech: () => () => {},
      onSpeechStart: () => () => {},
      onSpeechEnd: () => () => {},
    }));
    const Composer = () => {
      const { startDictation } = useComposerDictate();
      const end = useAuiState((s) => s.composer.lastDictationEnd);
      const code = end?.error?.code;
      return (
        <>
          <button onClick={startDictation}>dictate</button>
          <output>{end ? `${end.reason}:${code ?? ""}` : "none"}</output>
        </>
      );
    };
    const App = () => {
      const runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
        adapters: { dictation: { listen } },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Composer />
        </AssistantRuntimeProvider>
      );
    };
    const view = render(<App />);
    const button = view.getByRole("button");
    const output = view.container.querySelector("output")!;

    await act(async () => button.click());
    expect(output.textContent).toBe("none");

    status = {
      type: "ended",
      reason: "error",
      error: { code: "not-allowed", message: "Permission denied" },
    };
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(output.textContent).toBe("error:not-allowed");

    status = { type: "running" };
    await act(async () => button.click());
    expect(listen).toHaveBeenCalledTimes(2);
    expect(output.textContent).toBe("none");
  });
});
