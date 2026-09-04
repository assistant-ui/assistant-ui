// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { type FC, StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ChatModelAdapter } from "../../runtime/utils/chat-model-adapter";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useLocalRuntime } from "./useLocalRuntime";

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useLocalRuntime", () => {
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
});
