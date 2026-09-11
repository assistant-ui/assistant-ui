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

describe("InMemoryThreadList delete", () => {
  it("notifies onDelete with the removed thread id", async () => {
    const onDelete = vi.fn();
    let aui!: ReturnType<typeof useAui>;
    const Harness = () => {
      aui = useAui({
        threads: InMemoryThreadList({
          thread: (threadId) => StubThread({ threadId }) as never,
          onDelete,
        }),
      } as never);
      return <AuiProvider value={aui}>{null}</AuiProvider>;
    };
    render(<Harness />);
    await act(async () => {});

    await act(async () => {
      aui.threads.switchToNewThread();
    });
    const doomed = aui.threads.getState().mainThreadId;
    await act(async () => {
      aui.threads.item({ id: doomed }).delete();
    });
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(doomed);
  });

  it("starts a fresh thread when the last one is deleted", async () => {
    let aui!: ReturnType<typeof useAui>;
    const Harness = () => {
      aui = useAui({
        threads: InMemoryThreadList({
          thread: (threadId) => StubThread({ threadId }) as never,
        }),
      } as never);
      return <AuiProvider value={aui}>{null}</AuiProvider>;
    };
    render(<Harness />);
    await act(async () => {});

    await act(async () => {
      aui.threads.item({ id: "main" }).delete();
    });
    const state = aui.threads.getState();
    expect(state.threadIds).toHaveLength(1);
    expect(state.mainThreadId).toBe(state.threadIds[0]);
    expect(state.mainThreadId).not.toBe("main");
  });
});

describe("InMemoryThreadList item index selectors", () => {
  it("resolves index selectors within the archived and regular subsets", async () => {
    const { getAui } = setup();
    await act(async () => {});

    await act(async () => {
      getAui().threads.switchToNewThread();
    });
    await act(async () => {});
    const b = getAui().threads.getState().mainThreadId;

    await act(async () => {
      getAui().threads.switchToNewThread();
    });
    await act(async () => {});

    await act(async () => {
      getAui().threads.item({ id: b }).archive();
    });
    await act(async () => {});

    const state = getAui().threads.getState();
    expect(state.archivedThreadIds).toEqual([b]);
    expect(state.threadIds).toHaveLength(2);

    for (const [index, id] of state.archivedThreadIds.entries()) {
      expect(
        getAui().threads.item({ index, archived: true }).getState().id,
      ).toBe(id);
    }
    for (const [index, id] of state.threadIds.entries()) {
      expect(getAui().threads.item({ index }).getState().id).toBe(id);
      expect(
        getAui().threads.item({ index, archived: false }).getState().id,
      ).toBe(id);
    }

    expect(() =>
      getAui().threads.item({ index: state.threadIds.length }),
    ).toThrow("out of bounds");
    expect(() =>
      getAui().threads.item({
        index: state.archivedThreadIds.length,
        archived: true,
      }),
    ).toThrow("out of bounds");
  });
});
