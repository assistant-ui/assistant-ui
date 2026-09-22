// @vitest-environment jsdom

import { Activity, StrictMode, useEffect } from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../../types/message";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";

const userMessage: ThreadMessage = {
  id: "user-1",
  role: "user",
  content: [{ type: "text", text: "hello" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

describe("useExternalStoreRuntime lifecycle", () => {
  it("keeps voice connected through StrictMode replay and disconnects on unmount", async () => {
    const disconnect = vi.fn();
    const onVoiceTranscript = vi.fn();
    let emitTranscript!: (item: RealtimeVoiceAdapter.TranscriptItem) => void;
    const session: RealtimeVoiceAdapter.Session = {
      status: { type: "running" },
      isMuted: false,
      disconnect,
      mute: vi.fn(),
      unmute: vi.fn(),
      onStatusChange: () => () => {},
      onTranscript: (callback) => {
        emitTranscript = callback;
        return () => {};
      },
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    };
    let connected = false;
    const App = () => {
      const runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
        onVoiceTranscript,
        adapters: { voice: { connect: () => session } },
      });
      useEffect(() => {
        if (connected) return;
        connected = true;
        runtime.thread.connectVoice();
      }, [runtime]);
      return null;
    };

    const view = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await act(async () => Promise.resolve());
    expect(disconnect).not.toHaveBeenCalled();

    act(() => emitTranscript({ role: "assistant", text: "unfinished" }));
    view.unmount();
    await act(async () => Promise.resolve());
    expect(disconnect).toHaveBeenCalledOnce();
    expect(onVoiceTranscript).not.toHaveBeenCalled();

    act(() => emitTranscript({ role: "assistant", text: "late" }));
    expect(onVoiceTranscript).not.toHaveBeenCalled();
  });

  it("keeps voice connected while an Activity hides the runtime", async () => {
    const disconnect = vi.fn();
    const session: RealtimeVoiceAdapter.Session = {
      status: { type: "running" },
      isMuted: false,
      disconnect,
      mute: vi.fn(),
      unmute: vi.fn(),
      onStatusChange: () => () => {},
      onTranscript: () => () => {},
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    };
    let connected = false;
    const App = () => {
      const runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
        adapters: { voice: { connect: () => session } },
      });
      useEffect(() => {
        if (connected) return;
        connected = true;
        runtime.thread.connectVoice();
      }, [runtime]);
      return null;
    };

    const view = render(
      <Activity mode="visible">
        <App />
      </Activity>,
    );
    view.rerender(
      <Activity mode="hidden">
        <App />
      </Activity>,
    );
    await act(async () => Promise.resolve());
    expect(disconnect).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => Promise.resolve());
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("uses feedback supplied by the per-thread adapter context", () => {
    const submit = vi.fn();
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const App = () => {
      const runtime = useExternalStoreRuntime({
        messages: [userMessage],
        onNew: async () => {},
      });
      capture.runtime = runtime;
      return null;
    };

    render(
      <RuntimeAdapterProvider adapters={{ feedback: { submit } }}>
        <App />
      </RuntimeAdapterProvider>,
    );

    expect(capture.runtime!.thread.getState().capabilities.feedback).toBe(true);
    act(() => {
      capture
        .runtime!.thread.getMessageById("user-1")
        .submitFeedback({ type: "positive" });
    });
    expect(submit).toHaveBeenCalledWith({
      message: expect.objectContaining({ id: "user-1" }),
      type: "positive",
    });
  });

  it("keeps dispatching appends after StrictMode's simulated remount", async () => {
    const onNew = vi.fn(async () => {});
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const App = () => {
      const runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew,
      });
      capture.runtime = runtime;
      return null;
    };
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(capture.runtime).not.toBeNull();

    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("dispatches an append before unmount", async () => {
    let resolveInitialization!: () => void;
    const initialization = new Promise<void>((resolve) => {
      resolveInitialization = resolve;
    });
    const onNew = vi.fn(async () => {});
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const App = () => {
      const runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew,
      });
      capture.runtime = runtime;
      return null;
    };
    const view = render(<App />);
    expect(capture.runtime).not.toBeNull();
    const core = (
      capture.runtime!.thread as unknown as {
        __internal_threadBinding: {
          getState(): {
            __internal_setGetInitializePromise(
              getPromise: () => Promise<unknown> | undefined,
            ): void;
            append(message: unknown): Promise<void>;
          };
        };
      }
    ).__internal_threadBinding.getState();
    core.__internal_setGetInitializePromise(() => initialization);

    const appendPromise = core.append({
      parentId: null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(0),
    });
    await Promise.resolve();

    expect(onNew).toHaveBeenCalledTimes(1);

    view.unmount();
    resolveInitialization();

    await appendPromise;
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});
