// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui } from "@assistant-ui/store";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { createCloudThreadListAdapter } from "../cloud/createCloudThreadListAdapter";
import { useAssistantTransportRuntime } from "./useAssistantTransportRuntime";

const converter = (_state: unknown, meta: { isSending: boolean }) => ({
  messages: [],
  isRunning: meta.isSending,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAssistantTransportRuntime Cloud thread identity", () => {
  it("posts the ID returned by a fresh-thread initialization", async () => {
    let resolveCreate!: (value: { thread_id: string }) => void;
    const createPromise = new Promise<{ thread_id: string }>((resolve) => {
      resolveCreate = resolve;
    });
    const cloud = {
      registerSdk: vi.fn(),
      threads: {
        list: vi.fn(async () => ({ threads: [] })),
        create: vi.fn(() => createPromise),
      },
    };
    let requestBody: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      async (_url: RequestInfo | URL, init: RequestInit) => {
        requestBody = JSON.parse(init.body as string);
        return new Response(
          new ReadableStream({ start: (controller) => controller.close() }),
          { status: 200 },
        );
      },
    );

    const captured: { aui?: ReturnType<typeof useAui> } = {};
    const Capture: FC = () => {
      captured.aui = useAui();
      return null;
    };
    const App: FC = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter: createCloudThreadListAdapter({ cloud: cloud as never }),
        runtimeHook: function useAssistantTransportThreadRuntime() {
          return useAssistantTransportRuntime({
            initialState: {},
            api: "https://example.com/api",
            headers: {},
            converter,
          });
        },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => expect(captured.aui).toBeDefined());
    act(() => {
      void captured.aui!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });
    await waitFor(() => expect(cloud.threads.create).toHaveBeenCalledOnce());
    resolveCreate({ thread_id: "cloud-thread-1" });
    await waitFor(() => expect(requestBody).toBeDefined());
    expect(requestBody).toHaveProperty("threadId", "cloud-thread-1");
  });
});
