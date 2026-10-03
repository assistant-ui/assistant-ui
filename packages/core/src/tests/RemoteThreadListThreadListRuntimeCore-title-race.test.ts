import { describe, expect, it, vi } from "vitest";
import {
  getThreadData,
  type RemoteThreadState,
} from "../runtimes/remote-thread-list/remote-thread-state";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

const mountDeletableThread = async () => {
  const deleted = deferred<void>();
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [
        {
          status: "regular" as const,
          remoteId: "thread-1",
          externalId: "thread-1",
          title: "New chat",
        },
      ],
    })),
    delete: vi.fn(() => deleted.promise),
  });
  const core = createCore(adapter);
  await core.getLoadThreadsPromise();
  const internals = core as unknown as {
    _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    _state: { baseValue: RemoteThreadState };
  };
  internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });
  const isDeletionCommitted = () =>
    getThreadData(internals._state.baseValue, "thread-1") === undefined;
  return { adapter, core, deleted, isDeletionCommitted };
};

const openTitleStream = () => {
  let controller!: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
      c.enqueue({ type: "part-start", path: [0], part: { type: "text" } });
      c.enqueue({ type: "text-delta", path: [0], textDelta: "Generated" });
    },
  });
  return { stream, close: () => controller.close() };
};

const microtasks = async (count: number) => {
  for (let i = 0; i < count; i++) await Promise.resolve();
};

describe("RemoteThreadListThreadListRuntimeCore title generation", () => {
  it("preserves an existing title when generation returns no title", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "Existing title",
          },
        ],
      })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const internals = core as unknown as {
      _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    };
    internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });

    await core.generateTitle("thread-1");

    expect(adapter.generateTitle).toHaveBeenCalledOnce();
    expect(core.getItemById("thread-1")?.title).toBe("Existing title");
  });

  it("keeps a manual rename made during automatic title generation", async () => {
    const generatedTitle = deferred<ReadableStream>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "New chat",
          },
        ],
      })),
      generateTitle: vi.fn(async () => generatedTitle.promise as never),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const internals = core as unknown as {
      _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    };
    internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });

    const generation = core.generateTitle("thread-1", { automatic: true });
    await vi.waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    await core.rename("thread-1", "Manual title");

    generatedTitle.resolve(
      new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "part-start",
            path: [0],
            part: { type: "text" },
          });
          controller.enqueue({
            type: "text-delta",
            path: [0],
            textDelta: "Generated title",
          });
          controller.enqueue({ type: "part-finish", path: [0] });
          controller.close();
        },
      }),
    );
    await generation;

    expect(core.getItemById("thread-1")?.title).toBe("Manual title");
    expect(adapter.rename).toHaveBeenNthCalledWith(
      1,
      "thread-1",
      "Manual title",
    );
    expect(adapter.rename).toHaveBeenNthCalledWith(
      2,
      "thread-1",
      "Manual title",
    );
  });

  it("keeps a generated title when an earlier rename completes during another update", async () => {
    const reloadRequest = deferred<{
      threads: {
        status: "regular";
        remoteId: string;
        externalId: string;
        title: string;
      }[];
    }>();
    const adapter = makeAdapter({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          threads: [
            {
              status: "regular" as const,
              remoteId: "thread-1",
              externalId: "thread-1",
              title: "New chat",
            },
          ],
        })
        .mockImplementationOnce(() => reloadRequest.promise),
      generateTitle: vi.fn(
        async () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue({
                type: "part-start",
                path: [0],
                part: { type: "text" },
              });
              controller.enqueue({
                type: "text-delta",
                path: [0],
                textDelta: "Generated Title",
              });
              controller.enqueue({ type: "part-finish", path: [0] });
              controller.close();
            },
          }) as never,
      ),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const internals = core as unknown as {
      _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    };
    internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });

    const overlappingUpdate = core.reload();

    await core.rename("thread-1", "Instant name");
    await core.generateTitle("thread-1");

    expect(core.getItemById("thread-1")?.title).toBe("Generated Title");

    reloadRequest.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "thread-1",
          externalId: "thread-1",
          title: "New chat",
        },
      ],
    });
    await overlappingUpdate;

    expect(core.getItemById("thread-1")?.title).toBe("Generated Title");
  });

  it("does not apply a generated title after the adapter changes", async () => {
    const adapterA = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "Adapter A title",
          },
        ],
      })),
      generateTitle: vi.fn(
        async () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue({
                type: "part-start",
                path: [0],
                part: { type: "text" },
              });
              controller.enqueue({
                type: "text-delta",
                path: [0],
                textDelta: "Generated by adapter A",
              });
              controller.enqueue({ type: "part-finish", path: [0] });
              controller.close();
            },
          }) as never,
      ),
    });
    const adapterB = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "Adapter B title",
          },
        ],
      })),
    });
    const core = createCore(adapterA);
    await core.getLoadThreadsPromise();

    const internals = core as unknown as {
      _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    };
    internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });

    let replacementLoad: Promise<void> | undefined;
    let adapterChanged = false;
    const unsubscribe = core.subscribe(() => {
      if (
        adapterChanged ||
        core.getItemById("thread-1")?.title !== "Generated by adapter A"
      ) {
        return;
      }
      adapterChanged = true;
      core.__internal_setOptions({
        adapter: adapterB,
        runtimeHook: () => ({}) as never,
      });
      replacementLoad = core.getLoadThreadsPromise();
    });

    await core.generateTitle("thread-1");
    unsubscribe();
    expect(adapterChanged).toBe(true);
    await replacementLoad;

    expect(core.getItemById("thread-1")?.title).toBe("Adapter B title");
  });

  it("stops title requests for a thread once its deletion completes", async () => {
    const generatedTitle = deferred<ReadableStream>();
    let stream!: ReadableStreamDefaultController;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "New chat",
          },
        ],
      })),
      generateTitle: vi.fn(async () => generatedTitle.promise as never),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const internals = core as unknown as {
      _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    };
    internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });

    const generation = core.generateTitle("thread-1", { automatic: true });
    await vi.waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    generatedTitle.resolve(
      new ReadableStream({
        start(controller) {
          stream = controller;
          controller.enqueue({
            type: "part-start",
            path: [0],
            part: { type: "text" },
          });
          controller.enqueue({
            type: "text-delta",
            path: [0],
            textDelta: "Generated title",
          });
        },
      }),
    );
    await core.rename("thread-1", "Manual title");
    await core.delete("thread-1");

    stream.close();
    await generation;

    expect(adapter.rename).toHaveBeenCalledOnce();
  });

  it("stops a deleted thread's title run after a reload lists the same id again", async () => {
    const generatedTitle = deferred<ReadableStream>();
    let stream!: ReadableStreamDefaultController;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "New chat",
          },
        ],
      })),
      generateTitle: vi.fn(async () => generatedTitle.promise as never),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const internals = core as unknown as {
      _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    };
    internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });

    const generation = core.generateTitle("thread-1", { automatic: true });
    await vi.waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    generatedTitle.resolve(
      new ReadableStream({
        start(controller) {
          stream = controller;
          controller.enqueue({
            type: "part-start",
            path: [0],
            part: { type: "text" },
          });
          controller.enqueue({
            type: "text-delta",
            path: [0],
            textDelta: "Generated title",
          });
        },
      }),
    );
    await core.rename("thread-1", "Manual title");
    await core.delete("thread-1");
    await core.reload();
    expect(core.getItemById("thread-1")?.title).toBe("New chat");

    stream.close();
    await generation;

    expect(adapter.rename).toHaveBeenCalledOnce();
    expect(core.getItemById("thread-1")?.title).toBe("New chat");
  });

  // A deletion commits a few microtasks before its title state is cleared, so
  // these settle the deletion at every offset across that window.
  it("does not request a title between a deletion committing and its title state clearing", async () => {
    const late: number[] = [];
    for (let offset = 0; offset < 20; offset++) {
      const { adapter, core, deleted, isDeletionCommitted } =
        await mountDeletableThread();
      const renamed = deferred<void>();
      vi.mocked(adapter.rename).mockImplementation(() => renamed.promise);
      vi.mocked(adapter.generateTitle).mockImplementation(async () => {
        if (isDeletionCommitted()) late.push(offset);
        return new ReadableStream({
          start(controller) {
            controller.close();
          },
        }) as never;
      });

      const renaming = core.rename("thread-1", "Manual title");
      const generation = core.generateTitle("thread-1");
      const deleting = core.delete("thread-1");
      await vi.waitFor(() => {
        expect(adapter.delete).toHaveBeenCalledOnce();
      });
      renamed.resolve();
      await microtasks(offset);
      deleted.resolve();
      await Promise.all([renaming, generation, deleting]);
    }

    expect(late).toEqual([]);
  });

  it("does not write a rename back between a deletion committing and its title state clearing", async () => {
    const late: number[] = [];
    for (let offset = 0; offset < 20; offset++) {
      const { adapter, core, deleted, isDeletionCommitted } =
        await mountDeletableThread();
      const generatedTitle = openTitleStream();
      vi.mocked(adapter.generateTitle).mockResolvedValue(
        generatedTitle.stream as never,
      );
      vi.mocked(adapter.rename).mockImplementation(async () => {
        if (isDeletionCommitted()) late.push(offset);
      });

      const generation = core.generateTitle("thread-1", { automatic: true });
      await vi.waitFor(() => {
        expect(adapter.generateTitle).toHaveBeenCalledOnce();
      });
      await core.rename("thread-1", "Manual title");
      const deleting = core.delete("thread-1");
      await vi.waitFor(() => {
        expect(adapter.delete).toHaveBeenCalledOnce();
      });
      generatedTitle.close();
      await microtasks(offset);
      deleted.resolve();
      await Promise.all([generation, deleting]);
    }

    expect(late).toEqual([]);
  });

  it("does not request a title for a thread deleted while the request waits on a rename", async () => {
    const renamed = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "New chat",
          },
        ],
      })),
      rename: vi.fn(() => renamed.promise),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const internals = core as unknown as {
      _hookManager: { getThreadRuntimeCore: () => { messages: never[] } };
    };
    internals._hookManager.getThreadRuntimeCore = () => ({ messages: [] });

    const renaming = core.rename("thread-1", "Manual title");
    const generation = core.generateTitle("thread-1");
    await core.delete("thread-1");
    renamed.resolve();
    await renaming;
    await generation;

    expect(adapter.generateTitle).not.toHaveBeenCalled();
  });
});
