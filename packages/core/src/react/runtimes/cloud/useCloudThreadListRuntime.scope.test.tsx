// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatModelAdapter } from "../../../runtime/utils/chat-model-adapter";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useLocalRuntime } from "../useLocalRuntime";
import { useCloudThreadListRuntime } from "./useCloudThreadListRuntime";

const makeCloud = () =>
  ({
    registerSdk: vi.fn(),
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
      create: vi.fn().mockResolvedValue({ thread_id: "remote-1" }),
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

describe("useCloudThreadListRuntime scope changes", () => {
  it("rejects a draft attachment uploaded before the scope changed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cloud = makeCloud();
    const run = vi.fn<ChatModelAdapter["run"]>(async () => ({ content: [] }));
    const chatModel = { run };
    let runtime: AssistantRuntime | null = null;
    const useThreadRuntime = () => useLocalRuntime(chatModel);

    const App = ({ scopeId }: { scopeId: string }) => {
      runtime = useCloudThreadListRuntime({
        cloud,
        scopeId,
        runtimeHook: useThreadRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(<App scopeId="workspace-a" />);
    await waitFor(() => {
      expect(cloud.threads.list).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      await runtime!.thread.composer.addAttachment(
        new File(["hello"], "notes.txt", { type: "text/plain" }),
      );
    });
    expect(runtime!.thread.composer.getState().attachments[0]?.status).toEqual({
      type: "requires-action",
      reason: "composer-send",
    });
    const draftId = runtime!.threads.getState().mainThreadId;

    view.rerender(<App scopeId="workspace-b" />);
    await waitFor(() => {
      expect(cloud.threads.list).toHaveBeenCalledTimes(4);
    });
    expect(runtime!.threads.getState().mainThreadId).toBe(draftId);

    act(() => {
      runtime!.thread.composer.setText("send after switching workspaces");
      runtime!.thread.composer.send();
    });

    await waitFor(() => {
      expect(
        runtime!.thread.composer.getState().attachments[0]?.status,
      ).toEqual({
        type: "incomplete",
        reason: "error",
        message: "Attachment was uploaded for a different Cloud scope",
      });
    });
    expect(cloud.threads.create).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});
