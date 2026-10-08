// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { expect, it, vi } from "vitest";
import {
  actSettled,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly ThreadMessage[] = [];

it("restarts a running thread without notifying store subscribers during render", async () => {
  const adapter = makeAdapter();
  let isRunning = true;
  let aui: AssistantClient | undefined;
  const Probe = () => {
    aui = useAui();
    return null;
  };
  const App = () => {
    const runtime = useRemoteThreadListRuntime({
      adapter,
      initialThreadId: "thread-1",
      runtimeHook: function useRunningThreadRuntime() {
        return useExternalStoreRuntime<ThreadMessage>({
          messages: EMPTY_MESSAGES,
          isRunning,
          onNew: async () => {},
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Probe />
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  await waitFor(() => {
    expect(aui!.threadListItem.getState().status).toBe("regular");
    expect(aui!.threadListItem.getState().isRunning).toBe(true);
  });
  const error = vi.spyOn(console, "error");

  isRunning = false;
  await actSettled(() => aui!.threads.reloadMainThread());

  expect(aui!.threadListItem.getState().isRunning).toBe(false);
  expect(error).not.toHaveBeenCalled();
});
