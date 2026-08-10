// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { flushSync } from "react-dom";
import { describe, it, expect, vi } from "vitest";
import { useAui, AuiProvider } from "@assistant-ui/store";
import { InMemoryThreadList } from "../client/InMemoryThreadList";
import { ExternalThread } from "../index";

const renderThreads = (
  callbacks: {
    onSwitchToThread?: (threadId: string) => void;
    onSwitchToNewThread?: () => void;
  } = {},
) => {
  const captured: { aui?: ReturnType<typeof useAui> } = {};
  const Capture: FC = () => {
    captured.aui = useAui();
    return null;
  };
  const App: FC = () => {
    const aui = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [] }),
        ...callbacks,
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
  it("selects an existing regular thread when the selected thread is archived", async () => {
    const onSwitchToThread = vi.fn();
    const { aui } = renderThreads({ onSwitchToThread });

    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const siblingId = aui().threads.getState().mainThreadId;
    aui().threads.switchToThread("main");
    onSwitchToThread.mockClear();

    act(() => aui().threads.item({ id: "main" }).archive());

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.mainThreadId).toBe(siblingId);
      expect(state.threadIds).toContain(siblingId);
      expect(state.archivedThreadIds).toEqual(["main"]);
      expect(onSwitchToThread).toHaveBeenCalledOnce();
      expect(onSwitchToThread).toHaveBeenCalledWith(siblingId);
    });
  });

  it("reports a replacement when the last regular thread is archived", async () => {
    const onSwitchToThread = vi.fn();
    const onSwitchToNewThread = vi.fn();
    const { aui } = renderThreads({
      onSwitchToThread,
      onSwitchToNewThread,
    });

    act(() => aui().threads.item({ id: "main" }).archive());

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.threadIds).toHaveLength(1);
      expect(state.mainThreadId).toBe(state.threadIds[0]);
      expect(state.archivedThreadIds).toEqual(["main"]);
      expect(onSwitchToThread).toHaveBeenCalledOnce();
      expect(onSwitchToThread).toHaveBeenCalledWith(state.mainThreadId);
      expect(onSwitchToNewThread).not.toHaveBeenCalled();
    });
  });

  it("preserves an archived selection after an unrelated deletion", async () => {
    const { aui } = renderThreads();

    aui().threads.item({ id: "main" }).archive();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const regularId = aui().threads.getState().mainThreadId;

    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );
    aui().threads.item({ id: regularId }).delete();

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.mainThreadId).toBe("main");
      expect(state.archivedThreadIds).toEqual(["main"]);
      expect(state.threadIds).not.toContain(regularId);
    });
  });

  it("preserves an archived selection when it is archived again", async () => {
    const onSwitchToThread = vi.fn();
    const { aui } = renderThreads({ onSwitchToThread });

    aui().threads.item({ id: "main" }).archive();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );

    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );
    onSwitchToThread.mockClear();

    act(() => aui().threads.item({ id: "main" }).archive());

    expect(aui().threads.getState().mainThreadId).toBe("main");
    expect(onSwitchToThread).not.toHaveBeenCalled();
  });

  it("preserves an archived selection when another thread is archived", async () => {
    const onSwitchToThread = vi.fn();
    const { aui } = renderThreads({ onSwitchToThread });

    aui().threads.item({ id: "main" }).archive();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const regularId = aui().threads.getState().mainThreadId;

    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );
    onSwitchToThread.mockClear();

    act(() => aui().threads.item({ id: regularId }).archive());

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.mainThreadId).toBe("main");
      expect(state.threadIds).toEqual([]);
      expect(state.archivedThreadIds).toEqual(["main", regularId]);
      expect(onSwitchToThread).not.toHaveBeenCalled();
    });
  });

  it("keeps the selection valid across batched deletions", async () => {
    const { aui } = renderThreads();

    aui().threads.switchToNewThread();
    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().threadIds).toHaveLength(3),
    );
    const [, firstGeneratedId, lastGeneratedId] =
      aui().threads.getState().threadIds;

    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );

    act(() => {
      aui().threads.item({ id: "main" }).delete();
      aui().threads.item({ id: firstGeneratedId! }).delete();
    });

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.threadIds).toEqual([lastGeneratedId]);
      expect(state.mainThreadId).toBe(lastGeneratedId);
    });
  });

  it("preserves the archived sibling fallback when the selected thread is deleted", async () => {
    const onSwitchToThread = vi.fn();
    const { aui } = renderThreads({ onSwitchToThread });

    aui().threads.item({ id: "main" }).archive();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const regularId = aui().threads.getState().mainThreadId;
    onSwitchToThread.mockClear();

    act(() => aui().threads.item({ id: regularId }).delete());

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.mainThreadId).toBe("main");
      expect(state.threadIds).toEqual([]);
      expect(state.archivedThreadIds).toEqual(["main"]);
      expect(onSwitchToThread).toHaveBeenCalledOnce();
      expect(onSwitchToThread).toHaveBeenCalledWith("main");
    });
  });

  it("reports a replacement when the last thread is deleted", async () => {
    const onSwitchToThread = vi.fn();
    const onSwitchToNewThread = vi.fn();
    const { aui } = renderThreads({
      onSwitchToThread,
      onSwitchToNewThread,
    });

    act(() => aui().threads.item({ id: "main" }).delete());

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.threadIds).toHaveLength(1);
      expect(state.threadIds).not.toContain("main");
      expect(state.mainThreadId).toBe(state.threadIds[0]);
      expect(onSwitchToThread).toHaveBeenCalledOnce();
      expect(onSwitchToThread).toHaveBeenCalledWith(state.mainThreadId);
      expect(onSwitchToNewThread).not.toHaveBeenCalled();
    });
  });

  it("falls back to a live thread when the switch target is deleted in the same tick", async () => {
    const onSwitchToThread = vi.fn();
    const { aui } = renderThreads({ onSwitchToThread });

    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).not.toBe("main"),
    );
    const newId = aui().threads.getState().mainThreadId;
    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );
    onSwitchToThread.mockClear();

    act(() => {
      aui().threads.switchToThread(newId);
      aui().threads.item({ id: newId }).delete();
    });

    await waitFor(() => {
      const state = aui().threads.getState();
      expect(state.mainThreadId).toBe("main");
      expect(state.threadIds).not.toContain(newId);
      expect(onSwitchToThread).toHaveBeenCalledTimes(2);
      expect(onSwitchToThread).toHaveBeenLastCalledWith("main");
    });
  });

  it("does not report a relocation superseded by a newer switch", async () => {
    const onSwitchToThread = vi.fn();
    const { aui } = renderThreads({ onSwitchToThread });

    aui().threads.switchToNewThread();
    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().threadIds).toHaveLength(3),
    );
    const [, , latestId] = aui().threads.getState().threadIds;

    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );
    onSwitchToThread.mockClear();

    act(() => {
      aui().threads.item({ id: "main" }).archive();
      aui().threads.switchToThread(latestId!);
    });

    await waitFor(() => {
      expect(aui().threads.getState().mainThreadId).toBe(latestId);
      expect(onSwitchToThread.mock.calls).toEqual([[latestId]]);
    });
  });

  it("does not report a relocation superseded before its effect flushes", async () => {
    const onSwitchToThread = vi.fn();
    const { aui } = renderThreads({ onSwitchToThread });

    aui().threads.switchToNewThread();
    aui().threads.switchToNewThread();
    await waitFor(() =>
      expect(aui().threads.getState().threadIds).toHaveLength(3),
    );
    const [, , latestId] = aui().threads.getState().threadIds;

    aui().threads.switchToThread("main");
    await waitFor(() =>
      expect(aui().threads.getState().mainThreadId).toBe("main"),
    );
    onSwitchToThread.mockClear();

    flushSync(() => aui().threads.item({ id: "main" }).archive());
    aui().threads.switchToThread(latestId!);

    await waitFor(() => {
      expect(aui().threads.getState().mainThreadId).toBe(latestId);
      expect(onSwitchToThread.mock.calls).toEqual([[latestId]]);
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
