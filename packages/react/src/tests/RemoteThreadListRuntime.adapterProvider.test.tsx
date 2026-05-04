// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import {
  RuntimeAdapterProvider,
  useRemoteThreadListRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import { makeAdapter } from "./remote-thread-list-test-helpers";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { AssistantRuntimeProvider } from "../context";
import type { ChatModelAdapter, RemoteThreadListAdapter } from "../index";
import type {
  RuntimeAdapters as RuntimeAdaptersShape,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";

type CapturedAdapters = RuntimeAdaptersShape | null;

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const dummyHistory: ThreadHistoryAdapter = {
  load: async () => ({ messages: [] }),
  append: async () => {},
};

const makeRuntimeHook = (capture: { adapters: CapturedAdapters }) =>
  function useTestRuntimeHook() {
    capture.adapters = useRuntimeAdapters();
    return useLocalRuntime(noOpAdapter);
  };

async function renderAndWaitForBinder(
  adapter: RemoteThreadListAdapter,
  capture: { adapters: CapturedAdapters },
) {
  const Inner: FC = () => {
    const runtime = useRemoteThreadListRuntime({
      runtimeHook: makeRuntimeHook(capture),
      adapter,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };

  // first thread instance arrives asynchronously via switchToNewThread.
  await act(async () => {
    render(<Inner />);
  });
  await waitFor(() => expect(capture.adapters).not.toBeNull());
}

const wrapInRuntimeAdapterProvider = (
  history: ThreadHistoryAdapter,
): FC<PropsWithChildren> =>
  function Provider({ children }) {
    return (
      <RuntimeAdapterProvider adapters={{ history }}>
        {children}
      </RuntimeAdapterProvider>
    );
  };

describe("RemoteThreadListAdapter.unstable_Provider", () => {
  it("makes RuntimeAdapterProvider context visible to the runtime hook", async () => {
    const capture: { adapters: CapturedAdapters } = { adapters: null };
    const adapter = makeAdapter({
      unstable_Provider: wrapInRuntimeAdapterProvider(dummyHistory),
    });
    await renderAndWaitForBinder(adapter, capture);

    expect(capture.adapters?.history).toBe(dummyHistory);
  });

  it("preserves modelContext from the outer runtime-core RuntimeAdapterProvider", async () => {
    const capture: { adapters: CapturedAdapters } = { adapters: null };
    const adapter = makeAdapter({
      unstable_Provider: wrapInRuntimeAdapterProvider(dummyHistory),
    });
    await renderAndWaitForBinder(adapter, capture);

    expect(capture.adapters?.history).toBe(dummyHistory);
    expect(capture.adapters?.modelContext).toBeDefined();
  });

  it("returns no history when no Provider is supplied", async () => {
    const capture: { adapters: CapturedAdapters } = { adapters: null };
    const adapter = makeAdapter();
    await renderAndWaitForBinder(adapter, capture);

    expect(capture.adapters?.history).toBeUndefined();
  });

  it("picks up a swapped Provider on re-render", async () => {
    const capture: { adapters: CapturedAdapters } = { adapters: null };
    const firstHistory: ThreadHistoryAdapter = {
      load: async () => ({ messages: [] }),
      append: async () => {},
    };
    const secondHistory: ThreadHistoryAdapter = {
      load: async () => ({ messages: [] }),
      append: async () => {},
    };

    const Inner: FC<{ history: ThreadHistoryAdapter }> = ({ history }) => {
      const adapter = makeAdapter({
        unstable_Provider: wrapInRuntimeAdapterProvider(history),
      });
      const runtime = useRemoteThreadListRuntime({
        runtimeHook: makeRuntimeHook(capture),
        adapter,
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<Inner history={firstHistory} />);
    });
    await waitFor(() => expect(capture.adapters?.history).toBe(firstHistory));

    await act(async () => {
      result!.rerender(<Inner history={secondHistory} />);
    });
    await waitFor(() => expect(capture.adapters?.history).toBe(secondHistory));
  });
});
