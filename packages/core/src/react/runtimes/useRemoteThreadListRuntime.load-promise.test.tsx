// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { useEffect } from "react";
import {
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];

afterEach(() => {
  cleanup();
});

describe("useRemoteThreadListRuntime list promises", () => {
  it("resolve after the threads client reports the loaded list", async () => {
    const list = deferred<{
      threads: { remoteId: string; status: "regular"; title: string }[];
    }>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const useThreadRuntime = () =>
      useExternalStoreRuntime({
        messages: EMPTY_MESSAGES,
        onNew: async () => {},
      } as never);

    let client: AssistantClient | undefined;
    const Capture = () => {
      const aui = useAui();
      useEffect(() => {
        client = aui;
      }, [aui]);
      return null;
    };

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: useThreadRuntime,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => expect(client).toBeDefined());
    const aui = client!;
    expect(aui.threads().getState().isLoading).toBe(true);

    const loaded = aui.threads().getLoadThreadsPromise();
    list.resolve({
      threads: [{ remoteId: "t1", status: "regular", title: "One" }],
    });
    await loaded;

    expect(aui.threads().getState().isLoading).toBe(false);
    expect(aui.threads().getState().threadIds).toEqual(["t1"]);

    vi.mocked(adapter.list).mockResolvedValueOnce({
      threads: [
        { remoteId: "t1", status: "regular", title: "One" },
        { remoteId: "t2", status: "regular", title: "Two" },
      ],
    });
    await aui.threads().reload();

    expect(aui.threads().getState().threadIds).toEqual(["t1", "t2"]);
  });
});
