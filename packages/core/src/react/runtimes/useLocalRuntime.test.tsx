// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { Activity, type FC, StrictMode, useEffect, version } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useLocalRuntime } from "./useLocalRuntime";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { PendingAttachment } from "../../types/attachment";

const onReact18 = version.startsWith("18.");

const chatModel: ChatModelAdapter = {
  run: async () => ({ content: [] }),
};

const makeCloud = () =>
  ({
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
    },
    files: {
      generatePresignedUploadUrl: vi.fn().mockResolvedValue({
        signedUrl: "https://storage.example/upload",
        publicUrl: "https://cdn.example/file.txt",
      }),
    },
  }) as unknown as AssistantCloud;

const makeDeferredAttachmentAdapter = () => {
  let resolveSend!: () => void;
  let rejectSend!: (reason: Error) => void;
  const send = vi.fn<AttachmentAdapter["send"]>(
    (attachment: PendingAttachment) =>
      new Promise((resolve, reject) => {
        resolveSend = () =>
          resolve({ ...attachment, status: { type: "complete" }, content: [] });
        rejectSend = reject;
      }),
  );
  const adapter: AttachmentAdapter = {
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
  return {
    adapter,
    send,
    resolve: () => resolveSend(),
    reject: () => rejectSend(new Error("upload failed")),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useLocalRuntime", () => {
  it.each(["resolve", "reject"] as const)(
    "aborts a pending attachment send when the hosted thread unmounts and the adapter will %s",
    async (outcome) => {
      const upload = makeDeferredAttachmentAdapter();
      const run = vi.fn<ChatModelAdapter["run"]>(async () => ({ content: [] }));
      let runtime: AssistantRuntime | null = null;
      const App = () => {
        runtime = useLocalRuntime(
          { run },
          { adapters: { attachments: upload.adapter } },
        );
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <div />
          </AssistantRuntimeProvider>
        );
      };

      const view = render(<App />);
      await act(async () => {
        await runtime!.thread.composer.addAttachment(
          new File(["hello"], "notes.txt", { type: "text/plain" }),
        );
      });
      act(() => {
        runtime!.thread.composer.setText("hello");
        runtime!.thread.composer.send();
      });
      expect(upload.send).toHaveBeenCalledOnce();
      const signal = upload.send.mock.lastCall?.[1]?.signal;
      expect(signal?.aborted).toBe(false);

      view.unmount();
      await act(async () => Promise.resolve());
      expect(signal?.aborted).toBe(true);
      await act(async () => upload[outcome]());

      expect(run).not.toHaveBeenCalled();
      expect(runtime!.thread.composer.getState()).toMatchObject({
        text: "",
        attachments: [],
        submission: undefined,
      });
    },
  );

  it("delivers a pending attachment send after StrictMode replay", async () => {
    const upload = makeDeferredAttachmentAdapter();
    const run = vi.fn<ChatModelAdapter["run"]>(async () => ({ content: [] }));
    let runtime: AssistantRuntime | null = null;
    const App = () => {
      runtime = useLocalRuntime(
        { run },
        { adapters: { attachments: upload.adapter } },
      );
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await act(async () => {
      await runtime!.thread.composer.addAttachment(
        new File(["hello"], "notes.txt", { type: "text/plain" }),
      );
    });
    act(() => runtime!.thread.composer.send());
    expect(upload.send).toHaveBeenCalledOnce();
    const signal = upload.send.mock.lastCall?.[1]?.signal;
    expect(signal?.aborted).toBe(false);

    await act(async () => upload.resolve());
    await waitFor(() => expect(run).toHaveBeenCalledOnce());
    expect(signal?.aborted).toBe(false);
    view.unmount();
  });

  // Activity is React 19 only.
  it.skipIf(onReact18)(
    "delivers a pending attachment send after Activity hide and reveal",
    async () => {
      const upload = makeDeferredAttachmentAdapter();
      const run = vi.fn<ChatModelAdapter["run"]>(async () => ({ content: [] }));
      let runtime: AssistantRuntime | null = null;
      const App = () => {
        runtime = useLocalRuntime(
          { run },
          { adapters: { attachments: upload.adapter } },
        );
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
      await act(async () => {
        await runtime!.thread.composer.addAttachment(
          new File(["hello"], "notes.txt", { type: "text/plain" }),
        );
      });
      act(() => runtime!.thread.composer.send());
      expect(upload.send).toHaveBeenCalledOnce();
      const signal = upload.send.mock.lastCall?.[1]?.signal;

      view.rerender(renderApp("hidden"));
      expect(signal?.aborted).toBe(false);
      await act(async () => upload.resolve());
      await waitFor(() => expect(run).toHaveBeenCalledOnce());
      view.rerender(renderApp("visible"));
      expect(run).toHaveBeenCalledOnce();
      view.unmount();
    },
  );

  const createVoiceApp = () => {
    const disconnect = vi.fn();
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
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    let connected = false;
    const App = () => {
      const runtime = useLocalRuntime(chatModel, {
        adapters: { voice: { connect: () => session } },
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
    return {
      App,
      capture,
      disconnect,
      emitTranscript: (item: RealtimeVoiceAdapter.TranscriptItem) =>
        emitTranscript(item),
    };
  };

  it("keeps voice connected through StrictMode replay and disconnects on unmount", async () => {
    const { App, disconnect } = createVoiceApp();

    const view = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await act(async () => Promise.resolve());
    expect(disconnect).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => Promise.resolve());
    expect(disconnect).toHaveBeenCalledOnce();
  });

  // Activity is React 19 only.
  it.skipIf(onReact18)(
    "keeps voice and the thread through Activity hide and reveal",
    async () => {
      const { App, capture, disconnect, emitTranscript } = createVoiceApp();
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
      expect(capture.runtime!.thread.getState().messages).toHaveLength(1);

      view.unmount();
      await act(async () => Promise.resolve());
      expect(disconnect).toHaveBeenCalledOnce();
    },
  );

  it("passes the remote id of a fresh Cloud thread to its first run", async () => {
    const cloud = {
      registerSdk: vi.fn(),
      telemetry: { enabled: false },
      threads: {
        list: vi.fn().mockResolvedValue({ threads: [] }),
        create: vi.fn().mockResolvedValue({ thread_id: "remote-thread" }),
        messages: {
          list: vi.fn().mockResolvedValue({ messages: [] }),
          create: vi.fn().mockResolvedValue({ message_id: "message-1" }),
          update: vi.fn().mockResolvedValue(undefined),
        },
      },
      runs: {
        stream: vi.fn().mockResolvedValue(
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        ),
      },
    } as unknown as AssistantCloud;
    const threadIds: (string | undefined)[] = [];
    const run: ChatModelAdapter = {
      run: async ({ unstable_threadId }) => {
        threadIds.push(unstable_threadId);
        return { content: [] };
      },
    };
    let runtime: ReturnType<typeof useLocalRuntime> | null = null;
    const App = () => {
      runtime = useLocalRuntime(run, { cloud });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(runtime!.threads.mainItem.getState().id).toBeDefined();
    });

    await runtime!.thread.append("hello");

    await waitFor(() => {
      expect(threadIds).toHaveLength(1);
    });
    expect(cloud.threads.create).toHaveBeenCalledTimes(1);
    expect(threadIds).toEqual(["remote-thread"]);
  });

  it("enables feedback for Cloud threads", async () => {
    const cloud = makeCloud();
    let runtime: ReturnType<typeof useLocalRuntime> | null = null;
    const App = () => {
      runtime = useLocalRuntime(chatModel, { cloud });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);

    await waitFor(() => {
      expect(cloud.threads.list).toHaveBeenCalledTimes(2);
      expect(runtime!.thread.getState().capabilities.feedback).toBe(true);
    });
  });

  it("surfaces the live thread after mount without user input", async () => {
    const auiRef: { current: ReturnType<typeof useAui> | null } = {
      current: null,
    };
    const loadingRef = { current: true };
    const Capture: FC = () => {
      auiRef.current = useAui();
      loadingRef.current = useAuiState((s) => s.thread.isLoading);
      return null;
    };

    const App = () => {
      const runtime = useLocalRuntime(chatModel, {
        unstable_enableMessageQueue: true,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(loadingRef.current).toBe(false);
      expect(auiRef.current!.thread.getState().capabilities.queue).toBe(true);
    });
  });

  it("keeps the Cloud thread list loaded across unrelated rerenders", async () => {
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();

    const App = ({
      cloud,
      label,
    }: {
      cloud: AssistantCloud;
      label: string;
    }) => {
      const runtime = useLocalRuntime(chatModel, { cloud });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div>{label}</div>
        </AssistantRuntimeProvider>
      );
    };

    const { rerender } = render(<App cloud={firstCloud} label="first" />);

    await waitFor(() => {
      expect(firstCloud.threads.list).toHaveBeenCalledTimes(2);
    });

    rerender(<App cloud={firstCloud} label="second" />);
    expect(firstCloud.threads.list).toHaveBeenCalledTimes(2);

    rerender(<App cloud={secondCloud} label="third" />);
    await waitFor(() => {
      expect(secondCloud.threads.list).toHaveBeenCalledTimes(2);
    });
    expect(firstCloud.threads.list).toHaveBeenCalledTimes(2);
  });

  it("uses the current Cloud client for attachment uploads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const firstCloud = makeCloud();
    const secondCloud = makeCloud();
    let addAttachment: ((file: File) => Promise<void>) | undefined;
    let getAttachmentStatus: (() => unknown) | undefined;

    const App = ({ cloud }: { cloud: AssistantCloud }) => {
      const runtime = useLocalRuntime(chatModel, { cloud });
      addAttachment = (file) => runtime.thread.composer.addAttachment(file);
      getAttachmentStatus = () =>
        runtime.thread.composer.getState().attachments[0]?.status;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    const { rerender } = render(<App cloud={firstCloud} />);

    await waitFor(() => {
      expect(firstCloud.threads.list).toHaveBeenCalledTimes(2);
    });

    rerender(<App cloud={secondCloud} />);

    await act(async () => {
      await addAttachment!(
        new File(["hello"], "notes.txt", { type: "text/plain" }),
      );
    });

    expect(firstCloud.files.generatePresignedUploadUrl).not.toHaveBeenCalled();
    expect(secondCloud.files.generatePresignedUploadUrl).toHaveBeenCalledOnce();
    expect(getAttachmentStatus!()).toEqual({
      type: "requires-action",
      reason: "composer-send",
    });
  });

  it("handles rejected history loads", async () => {
    const error = new Error("history unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const history = {
      load: vi.fn().mockRejectedValue(error),
      append: vi.fn().mockResolvedValue(undefined),
    };

    const App = () => {
      const runtime = useLocalRuntime(chatModel, { adapters: { history } });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    const renderApp = () => (
      <StrictMode>
        <App />
      </StrictMode>
    );
    const { rerender } = render(renderApp());

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] local thread history load failed:",
        error,
      );
    });

    const loadsAfterMount = history.load.mock.calls.length;
    const errorsAfterMount = consoleError.mock.calls.length;
    expect(loadsAfterMount).toBeGreaterThan(0);
    rerender(renderApp());
    expect(history.load).toHaveBeenCalledTimes(loadsAfterMount);
    expect(consoleError).toHaveBeenCalledTimes(errorsAfterMount);
  });

  it("exposes composer.canCancel while a run started after initial messages is in flight", async () => {
    const hangingModel: ChatModelAdapter = {
      async *run({ abortSignal }) {
        await new Promise<void>((resolve) => {
          if (abortSignal.aborted) {
            resolve();
            return;
          }
          abortSignal.addEventListener("abort", () => resolve(), {
            once: true,
          });
        });
      },
    };
    let runtime: ReturnType<typeof useLocalRuntime> | null = null;
    const App = () => {
      runtime = useLocalRuntime(hangingModel, {
        initialMessages: [
          {
            role: "assistant",
            content: [{ type: "text", text: "Hello" }],
            status: { type: "complete", reason: "stop" },
          },
        ],
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    act(() => {
      runtime!.thread.append("Run");
    });
    await waitFor(() => {
      expect(runtime!.thread.getState().isRunning).toBe(true);
      expect(runtime!.thread.composer.getState().canCancel).toBe(true);
    });
    act(() => {
      runtime!.thread.cancelRun();
    });
  });

  it("creates the Cloud thread of a thread seeded with initial messages on its first send", async () => {
    const cloud = {
      registerSdk: vi.fn(),
      telemetry: { enabled: false },
      threads: {
        list: vi.fn().mockResolvedValue({ threads: [] }),
        create: vi.fn().mockResolvedValue({ thread_id: "remote-thread" }),
        messages: {
          list: vi.fn().mockResolvedValue({ messages: [] }),
          create: vi.fn().mockResolvedValue({ message_id: "message-1" }),
          update: vi.fn().mockResolvedValue(undefined),
        },
      },
      runs: {
        stream: vi.fn().mockResolvedValue(
          new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
        ),
      },
    } as unknown as AssistantCloud;
    let runtime: ReturnType<typeof useLocalRuntime> | null = null;
    const App = () => {
      runtime = useLocalRuntime(chatModel, {
        cloud,
        initialMessages: [
          { role: "user", content: "What is assistant-ui?" },
          { role: "assistant", content: "A set of React components." },
        ],
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(cloud.threads.list).toHaveBeenCalledTimes(2);
      expect(runtime!.thread.getState().isLoading).toBe(false);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(cloud.threads.create).not.toHaveBeenCalled();
    expect(cloud.runs.stream).not.toHaveBeenCalled();

    await act(async () => {
      await runtime!.thread.append("hello");
    });

    await waitFor(() => {
      expect(cloud.threads.create).toHaveBeenCalledTimes(1);
      expect(cloud.runs.stream).toHaveBeenCalledTimes(1);
    });
  });

  describe("runs the first turn of a seeded thread with its remote id", () => {
    const renderSeeded = async (
      initialMessages: NonNullable<
        Parameters<typeof useLocalRuntime>[1]
      >["initialMessages"],
    ) => {
      const threadIds: (string | undefined)[] = [];
      let runtime: ReturnType<typeof useLocalRuntime> | null = null;
      const App = () => {
        runtime = useLocalRuntime(
          {
            run: async ({ unstable_threadId }) => {
              threadIds.push(unstable_threadId);
              return { content: [] };
            },
          },
          { initialMessages, unstable_humanToolNames: ["send_email"] },
        );
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <div />
          </AssistantRuntimeProvider>
        );
      };
      render(<App />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(runtime!.threads.mainItem.getState().status).toBe("new");
      return { runtime: runtime!, threadIds };
    };

    it("when a seeded tool approval is answered", async () => {
      const { runtime, threadIds } = await renderSeeded([
        { role: "user", content: "send an email" },
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call-send_email",
              toolName: "send_email",
              args: {},
              argsText: "{}",
              approval: { id: "a1" },
            },
          ],
        },
      ]);

      await act(async () => {
        await runtime.thread
          .getMessageByIndex(1)
          .getMessagePartByIndex(0)
          .respondToToolApproval({ approved: true });
      });

      await waitFor(() => {
        expect(threadIds).toHaveLength(1);
      });
      expect(threadIds[0]).toBeDefined();
      expect(threadIds[0]).toBe(runtime.threads.mainItem.getState().remoteId);
    });

    it("when its seeded answer is reloaded", async () => {
      const { runtime, threadIds } = await renderSeeded([
        { role: "user", content: "What is assistant-ui?" },
        { role: "assistant", content: "A set of React components." },
      ]);

      act(() => {
        runtime.thread.getMessageByIndex(1).reload();
      });

      await waitFor(() => {
        expect(threadIds).toHaveLength(1);
      });
      expect(threadIds[0]).toBeDefined();
      expect(threadIds[0]).toBe(runtime.threads.mainItem.getState().remoteId);
    });
  });
});
