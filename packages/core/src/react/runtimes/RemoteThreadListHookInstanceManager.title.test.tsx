// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useLocalRuntime } from "./useLocalRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { AppendMessage } from "../../types/message";
import {
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";

const userMessage = (text: string): AppendMessage => ({
  parentId: null,
  sourceId: null,
  runConfig: {},
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  startRun: false,
});

const getThreadCore = (runtime: AssistantRuntime) =>
  (
    runtime.thread as unknown as {
      __internal_threadBinding: {
        getState(): { append(message: AppendMessage): Promise<void> };
      };
    }
  ).__internal_threadBinding.getState();

describe("RemoteThreadListHookInstanceManager title generation", () => {
  it("generates the title once initialization resolves, without waiting for a run", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const generateTitle = vi.fn(async () => new ReadableStream());
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialization.promise),
      generateTitle,
    });
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () =>
          useLocalRuntime({ run: async () => ({ content: [] }) }),
      });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(runtimeRef.current?.threads.mainItem.getState().id).toBeDefined();
    });
    const localId = runtimeRef.current!.threads.mainItem.getState().id;

    void getThreadCore(runtimeRef.current!).append(userMessage("hello"));
    await Promise.resolve();

    expect(adapter.initialize).toHaveBeenCalledTimes(1);
    expect(generateTitle).not.toHaveBeenCalled();

    initialization.resolve({
      remoteId: `remote-${localId}`,
      externalId: `external-${localId}`,
    });

    await waitFor(() => {
      expect(generateTitle).toHaveBeenCalledTimes(1);
    });
    expect(generateTitle).toHaveBeenCalledWith(
      `remote-${localId}`,
      expect.any(Array),
    );
  });
});
