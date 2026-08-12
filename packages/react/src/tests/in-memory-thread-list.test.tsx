// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { describe, it, expect, vi } from "vitest";
import { useAui, AuiProvider } from "@assistant-ui/store";
import { InMemoryThreadList } from "../client/InMemoryThreadList";
import { ExternalThread } from "../index";

const renderThreads = () => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [] }),
      }),
    });
    return (
      <AuiProvider value={aui}>
        <Capture />
      </AuiProvider>
    );
  };
  render(<App />);
  return { aui: () => captured.aui! };
};

describe("InMemoryThreadList", () => {
  it("falls back to a live thread when the switch target is deleted in the same tick", async () => {
    const { aui } = renderThreads();

    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const newId = aui().threads.getState().mainThreadId;
    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );

    aui().threads.switchToThread(newId);
    aui().threads.item({ id: newId }).delete();

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.mainThreadId).toBe("main");
      expect(state.threadIds).not.toContain(newId);
    });
  });

  it("creates unique IDs for threads created in the same millisecond", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);

    try {
      const { aui } = renderThreads();
      aui().threads.switchToNewThread();
      aui().threads.switchToNewThread();

      await waitFor(() => {
        const generatedIds = aui()
          .threads.getState()
          .threadIds.filter((id) => id !== "main");
        expect(generatedIds).toHaveLength(2);
        expect(new Set(generatedIds).size).toBe(2);
      });
    } finally {
      now.mockRestore();
    }
  });
});

describe("InMemoryThreadList reloadMainThread", () => {
  it("routes reloadMainThread to the main thread's refetch callback", async () => {
    const refetched: string[] = [];
    const captured: { aui?: ReturnType<typeof useAui> } = {};
    const Capture: FC = () => {
      captured.aui = useAui();
      return null;
    };
    const App: FC = () => {
      const aui = useAui({
        threads: InMemoryThreadList({
          thread: (threadId) =>
            ExternalThread({
              messages: [],
              onRefetchThread: async () => {
                refetched.push(threadId);
              },
            }),
        }),
      });
      return (
        <AuiProvider value={aui}>
          <Capture />
        </AuiProvider>
      );
    };
    render(<App />);
    const aui = () => captured.aui!;

    await waitFor(() => expect(captured.aui).toBeDefined());
    await aui().threads.reloadMainThread();
    expect(refetched).toEqual(["main"]);

    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const newId = aui().threads.getState().mainThreadId;

    await aui().threads.reloadMainThread();
    expect(refetched).toEqual(["main", newId]);
  });

  it("resolves reloadMainThread when the thread has no refetch callback", async () => {
    const { aui } = renderThreads();

    await waitFor(() => expect(aui()).toBeDefined());
    await expect(aui().threads.reloadMainThread()).resolves.toBeUndefined();
  });
});

describe("InMemoryThreadList suggestions", () => {
  it("derives the suggestions scope from the main thread", async () => {
    const { aui } = renderThreads();

    await waitFor(() => {
      expect(aui().suggestions.getState()).toEqual({ suggestions: [] });
    });
    expect(aui().suggestions.getState()).toBe(
      aui().thread.suggestions().getState(),
    );
  });
});
