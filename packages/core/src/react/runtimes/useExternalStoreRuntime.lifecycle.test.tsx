// @vitest-environment jsdom

import { Activity, StrictMode, useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { InMemoryThreadListAdapter } from "../../runtimes/remote-thread-list/adapter/in-memory";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../../types/message";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { AttachmentAdapter } from "../../adapters/attachment";
import { useLocalRuntime } from "./useLocalRuntime";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import { captureThreadRuntimeDisposal } from "../../runtime/utils/thread-runtime-lifecycle";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";

const userMessage: ThreadMessage = {
  id: "user-1",
  role: "user",
  content: [{ type: "text", text: "hello" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

const createVoiceSession = () => {
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
  return { session, disconnect };
};

describe("useExternalStoreRuntime lifecycle", () => {
  it("disconnects a bare voice session once on unmount", async () => {
    const { session, disconnect } = createVoiceSession();
    let runtime!: AssistantRuntime;
    const App = () => {
      runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
        adapters: { voice: { connect: () => session } },
      });
      return null;
    };
    const view = render(<App />);
    act(() => runtime.thread.connectVoice());
    view.unmount();
    expect(disconnect).not.toHaveBeenCalled();
    await act(async () => Promise.resolve());
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("keeps a bare voice session through Activity hide and reveal", async () => {
    const { session, disconnect } = createVoiceSession();
    let runtime!: AssistantRuntime;
    const App = () => {
      runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
        adapters: { voice: { connect: () => session } },
      });
      return null;
    };
    const tree = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <App />
      </Activity>
    );
    const view = render(tree("visible"));
    act(() => runtime.thread.connectVoice());
    await act(async () => view.rerender(tree("hidden")));
    expect(disconnect).not.toHaveBeenCalled();
    await act(async () => view.rerender(tree("visible")));
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("keeps a bare voice session through StrictMode replay", async () => {
    const { session, disconnect } = createVoiceSession();
    let runtime!: AssistantRuntime;
    const App = () => {
      runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
        adapters: { voice: { connect: () => session } },
      });
      return null;
    };
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    act(() => runtime.thread.connectVoice());
    await act(async () => Promise.resolve());
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("aborts a bare pending attachment send on unmount", async () => {
    let resolveSend!: () => void;
    const send = vi.fn<AttachmentAdapter["send"]>(
      (attachment) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({
              ...attachment,
              status: { type: "complete" },
              content: [],
            });
        }),
    );
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: "attachment-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send,
    };
    const onNew = vi.fn(async () => {});
    let runtime!: AssistantRuntime;
    const App = () => {
      runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew,
        adapters: { attachments },
      });
      return null;
    };
    const view = render(<App />);
    await act(async () =>
      runtime.thread.composer.addAttachment(
        new File(["hello"], "notes.txt", { type: "text/plain" }),
      ),
    );
    act(() => runtime.thread.composer.send());
    expect(send).toHaveBeenCalledOnce();
    const signal = send.mock.lastCall?.[1]?.signal;
    expect(signal?.aborted).toBe(false);
    view.unmount();
    await act(async () => Promise.resolve());
    await act(async () => resolveSend());
    expect(onNew).not.toHaveBeenCalled();
    expect(signal?.aborted).toBe(true);
  });

  it("delivers a hosted pending attachment send across a thread restart", async () => {
    let resolveSend!: () => void;
    const send = vi.fn<AttachmentAdapter["send"]>(
      (attachment) =>
        new Promise((resolve) => {
          resolveSend = () =>
            resolve({
              ...attachment,
              status: { type: "complete" },
              content: [],
            });
        }),
    );
    const attachments: AttachmentAdapter = {
      accept: "*",
      add: async ({ file }) => ({
        id: "attachment-1",
        type: "document",
        name: file.name,
        contentType: file.type,
        file,
        status: { type: "requires-action", reason: "composer-send" },
      }),
      remove: async () => {},
      send,
    };
    const onNew = vi.fn(async () => {});
    const adapter = makeAdapter();
    let runtime!: AssistantRuntime;
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        initialThreadId: "thread-1",
        runtimeHook: function useThreadRuntime() {
          return useExternalStoreRuntime<ThreadMessage>({
            messages: [],
            onNew,
            adapters: { attachments },
          });
        },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };
    render(<App />);
    await waitFor(() => {
      expect(runtime.threads.mainItem.getState().status).toBe("regular");
    });
    const outgoing = (
      runtime.thread as unknown as {
        __internal_threadBinding: { getState(): ThreadRuntimeCore };
      }
    ).__internal_threadBinding.getState();
    const disposal = captureThreadRuntimeDisposal(outgoing);
    await act(async () =>
      runtime.thread.composer.addAttachment(
        new File(["hello"], "notes.txt", { type: "text/plain" }),
      ),
    );
    act(() => {
      runtime.thread.composer.setText("hello");
      runtime.thread.composer.send();
    });
    expect(send).toHaveBeenCalledOnce();
    const signal = send.mock.lastCall?.[1]?.signal;
    expect(signal?.aborted).toBe(false);

    await act(() => runtime.threads.reloadMainThread());

    const disposedAfterRestart = disposal.aborted;
    const abortedAfterRestart = signal?.aborted;
    await act(async () => resolveSend());
    expect(disposedAfterRestart).toBe(false);
    expect(abortedAfterRestart).toBe(false);
    expect(onNew).toHaveBeenCalledOnce();
    expect(signal?.aborted).toBe(false);
  });

  it("disconnects a replaced hosted voice session and keeps its successor", async () => {
    const first = createVoiceSession();
    const second = createVoiceSession();
    const connect = vi
      .fn()
      .mockReturnValueOnce(first.session)
      .mockReturnValue(second.session);
    let runtime!: AssistantRuntime;
    const App = ({ hostKey }: { hostKey: number }) => {
      runtime = useLocalRuntime(
        { run: async () => ({ content: [] }) },
        {
          adapters: { voice: { connect } },
        },
      );
      return (
        <AssistantRuntimeProvider key={hostKey} runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };
    const view = render(<App hostKey={0} />);
    act(() => runtime.thread.connectVoice());
    await act(async () => view.rerender(<App hostKey={1} />));
    expect(first.disconnect).toHaveBeenCalledOnce();
    await act(async () => view.rerender(<App hostKey={1} />));
    expect(first.disconnect).toHaveBeenCalledOnce();
    act(() => runtime.thread.connectVoice());
    expect(second.disconnect).not.toHaveBeenCalled();
    expect(runtime.thread.getState().voice).toBeDefined();
  });

  it("keeps hosted voice connected through an Activity hide around its provider", async () => {
    const { session, disconnect } = createVoiceSession();
    let runtime!: AssistantRuntime;
    const App = () => {
      runtime = useLocalRuntime(
        { run: async () => ({ content: [] }) },
        {
          adapters: { voice: { connect: () => session } },
        },
      );
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };
    const tree = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <App />
      </Activity>
    );
    const view = render(tree("visible"));
    act(() => runtime.thread.connectVoice());
    await act(async () => view.rerender(tree("hidden")));
    expect(disconnect).not.toHaveBeenCalled();
    await act(async () => view.rerender(tree("visible")));
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("keeps voice through Activity hide and reveal when hosted by a remote thread list", async () => {
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
    const adapter = new InMemoryThreadListAdapter();
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    let connected = false;
    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        runtimeHook: function RuntimeHook() {
          return useExternalStoreRuntime<ThreadMessage>({
            messages: [],
            onNew: async () => {},
            onVoiceTranscript,
            adapters: { voice: { connect: () => session } },
          });
        },
        adapter,
      });
      capture.runtime = runtime;
      useEffect(() => {
        if (connected) return;
        connected = true;
        runtime.thread.connectVoice();
      }, [runtime]);
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };
    const renderApp = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <App />
      </Activity>
    );

    const view = render(renderApp("visible"));
    await act(async () => Promise.resolve());
    view.rerender(renderApp("hidden"));
    await act(async () => Promise.resolve());
    view.rerender(renderApp("visible"));
    await act(async () => Promise.resolve());

    expect(disconnect).not.toHaveBeenCalled();
    expect(capture.runtime!.thread.getState().voice).toBeDefined();

    act(() =>
      emitTranscript({ role: "user", text: "after reveal", isFinal: true }),
    );
    expect(onVoiceTranscript).toHaveBeenCalledOnce();

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
