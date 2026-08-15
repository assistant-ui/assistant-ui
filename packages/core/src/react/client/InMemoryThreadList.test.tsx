// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider, useAui, useAuiEvent } from "@assistant-ui/store";
import { InMemoryThreadList } from "./InMemoryThreadList";

const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };
const useStubThread = (_props: { threadId: string }) => ({
  getState: () => ({ isRunning: false }),
  composer: () => stubComposer,
  suggestions: () => stubSuggestions,
});
const StubThread = resource(useStubThread);

const setup = () => {
  const selectionChanged = vi.fn();
  let aui!: ReturnType<typeof useAui>;
  const Consumer = () => {
    useAuiEvent("threads.selectionChanged" as never, selectionChanged as never);
    return null;
  };
  const Harness = () => {
    aui = useAui({
      threads: InMemoryThreadList({
        thread: (threadId) => StubThread({ threadId }) as never,
      }),
    } as never);
    return (
      <AuiProvider value={aui}>
        <Consumer />
      </AuiProvider>
    );
  };
  render(<Harness />);
  return { getAui: () => aui, selectionChanged };
};

describe("InMemoryThreadList selection events", () => {
  it("does not emit for the initially selected thread on mount", async () => {
    const { selectionChanged } = setup();
    await act(async () => {});
    expect(selectionChanged).not.toHaveBeenCalled();
  });

  it("emits on switchToNewThread and on switching back", async () => {
    const { getAui, selectionChanged } = setup();
    await act(async () => {});

    await act(async () => {
      getAui().threads.switchToNewThread();
    });
    await act(async () => {});

    const newThreadId = getAui().threads.getState().mainThreadId;
    expect(newThreadId).not.toBe("main");
    expect(selectionChanged).toHaveBeenCalledExactlyOnceWith({
      threadId: newThreadId,
      previousThreadId: "main",
    });

    await act(async () => {
      getAui().threads.switchToThread("main");
    });
    await act(async () => {});

    expect(selectionChanged).toHaveBeenCalledTimes(2);
    expect(selectionChanged).toHaveBeenLastCalledWith({
      threadId: "main",
      previousThreadId: newThreadId,
    });
  });

  it("emits when deleting the selected thread falls back to another", async () => {
    const { getAui, selectionChanged } = setup();
    await act(async () => {});

    await act(async () => {
      getAui().threads.switchToNewThread();
    });
    await act(async () => {});

    const newThreadId = getAui().threads.getState().mainThreadId;
    selectionChanged.mockClear();

    await act(async () => {
      getAui().threads.item({ id: newThreadId }).delete();
    });
    await act(async () => {});

    expect(getAui().threads.getState().mainThreadId).toBe("main");
    expect(selectionChanged).toHaveBeenCalledExactlyOnceWith({
      threadId: "main",
      previousThreadId: newThreadId,
    });
  });
});
