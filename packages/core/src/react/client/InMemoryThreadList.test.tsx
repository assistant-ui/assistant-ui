// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider, useAui, useAuiEvent } from "@assistant-ui/store";
import type { AttachmentAdapter } from "../../adapters/attachment";
import { ExternalThread } from "../../store/clients/external-thread";
import { InMemoryThreadList } from "./InMemoryThreadList";

const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };
const useStubThread = (_props: { threadId: string }) => ({
  getState: () => ({ isRunning: false }),
  composer: () => stubComposer,
  suggestions: () => stubSuggestions,
});
const StubThread = resource(useStubThread);

const useDraftThread = (_props: { threadId: string }) => {
  const [text, setText] = useState("");
  const composerState = useMemo(() => ({ text }), [text]);
  const composer = useMemo(
    () => ({ getState: () => composerState, setText }),
    [composerState],
  );
  return {
    getState: () => ({ isRunning: false }),
    composer: () => composer,
    suggestions: () => stubSuggestions,
  };
};
const DraftThread = resource(useDraftThread);

const setupPendingAttachmentSend = async () => {
  const upload = Promise.withResolvers<void>();
  let aui!: ReturnType<typeof useAui>;
  const mainOnNew = vi.fn(() => aui.thread.getState().messages.length);
  const otherOnNew = vi.fn();
  let sendSignal: AbortSignal | undefined;
  const attachmentAdapter: AttachmentAdapter = {
    accept: "*",
    add: async ({ file }) => ({
      id: file.name,
      type: "file",
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action", reason: "composer-send" },
    }),
    remove: async () => {},
    send: async (attachment, options) => {
      sendSignal = options?.signal;
      await upload.promise;
      return {
        ...attachment,
        status: { type: "complete" },
        content: [],
      };
    },
  };
  const Harness = () => {
    aui = useAui({
      threads: InMemoryThreadList({
        thread: (threadId) =>
          ExternalThread({
            messages: [],
            isRunning: false,
            attachmentAdapter,
            onNew: threadId === "main" ? mainOnNew : otherOnNew,
          }),
      }),
    });
    return <AuiProvider value={aui}>{null}</AuiProvider>;
  };
  const view = render(<Harness />);
  await act(async () => {});

  await act(async () => {
    await aui.composer.addAttachment(
      new File(["content"], "note.txt", { type: "text/plain" }),
    );
    aui.composer.setText("sent from main");
    void aui.composer.send();
  });
  expect(sendSignal).toBeDefined();
  expect(aui.thread.getState().messages).toHaveLength(1);
  expect(aui.composer.getState().submission?.text).toBe("sent from main");

  return {
    getAui: () => aui,
    unmount: () => view.unmount(),
    getSendSignal: () => sendSignal,
    mainOnNew,
    otherOnNew,
    resolveUpload: async () => {
      await act(async () => {
        upload.resolve();
        await upload.promise;
      });
    },
  };
};

const setup = () => {
  const selectionChanged = vi.fn();
  const switchedTo = vi.fn();
  const switchedAway = vi.fn();
  let aui!: ReturnType<typeof useAui>;
  const Consumer = () => {
    useAuiEvent("threads.selectionChanged" as never, selectionChanged as never);
    useAuiEvent("threadListItem.switchedTo" as never, switchedTo as never);
    useAuiEvent(
      { scope: "*", event: "threadListItem.switchedAway" } as never,
      switchedAway as never,
    );
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
  return { getAui: () => aui, selectionChanged, switchedTo, switchedAway };
};

describe("InMemoryThreadList selection events", () => {
  it("does not emit for the initially selected thread on mount", async () => {
    const { selectionChanged, switchedTo, switchedAway } = setup();
    await act(async () => {});
    expect(selectionChanged).not.toHaveBeenCalled();
    expect(switchedTo).not.toHaveBeenCalled();
    expect(switchedAway).not.toHaveBeenCalled();
  });

  it("emits on switchToNewThread and on switching back", async () => {
    const { getAui, selectionChanged, switchedTo, switchedAway } = setup();
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
    expect(switchedTo).toHaveBeenCalledExactlyOnceWith({
      threadId: newThreadId,
    });
    expect(switchedAway).toHaveBeenCalledExactlyOnceWith({ threadId: "main" });

    await act(async () => {
      getAui().threads.switchToThread("main");
    });
    await act(async () => {});

    expect(selectionChanged).toHaveBeenCalledTimes(2);
    expect(selectionChanged).toHaveBeenLastCalledWith({
      threadId: "main",
      previousThreadId: newThreadId,
    });
    expect(switchedTo).toHaveBeenCalledTimes(2);
    expect(switchedTo).toHaveBeenLastCalledWith({ threadId: "main" });
    expect(switchedAway).toHaveBeenCalledTimes(2);
    expect(switchedAway).toHaveBeenLastCalledWith({ threadId: newThreadId });
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

describe("InMemoryThreadList thread state", () => {
  it("does not carry a composer draft into another thread", async () => {
    let aui!: ReturnType<typeof useAui>;
    const Harness = () => {
      aui = useAui({
        threads: InMemoryThreadList({
          thread: (threadId) => DraftThread({ threadId }) as never,
        }),
      } as never);
      return <AuiProvider value={aui}>{null}</AuiProvider>;
    };
    render(<Harness />);
    await act(async () => {});

    await act(async () => {
      aui.composer.setText("draft for main");
    });
    expect(aui.composer.getState().text).toBe("draft for main");

    await act(async () => {
      aui.threads.switchToNewThread();
    });
    await act(async () => {});

    expect(aui.composer.getState().text).toBe("");
  });

  it("aborts a pending attachment send when the selected thread is deleted", async () => {
    const { getAui, getSendSignal, mainOnNew, resolveUpload } =
      await setupPendingAttachmentSend();

    await act(async () => {
      getAui().threads.item({ id: "main" }).delete();
    });
    expect(getSendSignal()?.aborted).toBe(true);

    await resolveUpload();
    expect(mainOnNew).not.toHaveBeenCalled();
  });

  it.each([
    ["while its thread is selected", false],
    ["after switching away from its thread", true],
  ])(
    "aborts a pending attachment send when the list's owner unmounts %s",
    async (_, switchAway) => {
      const {
        getAui,
        getSendSignal,
        mainOnNew,
        otherOnNew,
        resolveUpload,
        unmount,
      } = await setupPendingAttachmentSend();

      if (switchAway) {
        await act(async () => {
          getAui().threads.switchToNewThread();
        });
      }
      expect(getSendSignal()?.aborted).toBe(false);

      unmount();
      await act(async () => {});
      expect(getSendSignal()?.aborted).toBe(true);

      await resolveUpload();
      expect(mainOnNew).not.toHaveBeenCalled();
      expect(otherOnNew).not.toHaveBeenCalled();
    },
  );

  it("aborts a pending attachment send when an unselected thread is deleted", async () => {
    const { getAui, getSendSignal, mainOnNew, resolveUpload } =
      await setupPendingAttachmentSend();

    await act(async () => {
      getAui().threads.switchToNewThread();
    });
    expect(getSendSignal()?.aborted).toBe(false);

    await act(async () => {
      getAui().threads.item({ id: "main" }).delete();
    });
    expect(getSendSignal()?.aborted).toBe(true);

    await resolveUpload();
    expect(mainOnNew).not.toHaveBeenCalled();
  });

  it("delivers a pending attachment send to its original thread after switching", async () => {
    const { getAui, getSendSignal, mainOnNew, otherOnNew, resolveUpload } =
      await setupPendingAttachmentSend();

    await act(async () => {
      getAui().threads.switchToNewThread();
    });
    expect(getSendSignal()?.aborted).toBe(false);
    expect(getAui().thread.getState().messages).toEqual([]);
    expect(getAui().composer.getState().submission).toBeUndefined();

    await resolveUpload();
    await waitFor(() => expect(mainOnNew).toHaveBeenCalledTimes(1));
    expect(mainOnNew).toHaveReturnedWith(0);
    expect(otherOnNew).not.toHaveBeenCalled();
    expect(getAui().thread.getState().messages).toEqual([]);
    expect(getAui().composer.getState().submission).toBeUndefined();
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
