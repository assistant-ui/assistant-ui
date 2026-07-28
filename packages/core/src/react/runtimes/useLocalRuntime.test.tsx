// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
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
      expect(firstCloud.threads.list).toHaveBeenCalledOnce();
    });

    rerender(<App cloud={firstCloud} label="second" />);
    expect(firstCloud.threads.list).toHaveBeenCalledOnce();

    rerender(<App cloud={secondCloud} label="third" />);
    await waitFor(() => {
      expect(secondCloud.threads.list).toHaveBeenCalledOnce();
    });
    expect(firstCloud.threads.list).toHaveBeenCalledOnce();
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
      expect(firstCloud.threads.list).toHaveBeenCalledOnce();
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

    rerender(renderApp());
    expect(history.load).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
