import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import { ReadonlyThreadRuntimeCore } from "../../runtimes/readonly/ReadonlyThreadRuntimeCore";
import { EMPTY_THREAD_CORE } from "../../runtimes/remote-thread-list/empty-thread-core";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import { MessageNotSentError } from "../../types/error";
import { AssistantRuntimeImpl } from "./assistant-runtime";
import {
  ThreadRuntimeImpl,
  type ThreadListItemRuntimeBinding,
  type ThreadRuntimeCoreBinding,
} from "./thread-runtime";

describe("ThreadRuntime.append", () => {
  it.each([
    { parent: { parentId: null }, expectedParent: null, visible: ["new"] },
    {
      parent: {},
      expectedParent: "tail",
      visible: ["root", "tail", "new"],
    },
    {
      parent: { parentId: "root" },
      expectedParent: "root",
      visible: ["root", "new"],
    },
  ])(
    "selects the branch under $expectedParent",
    ({ parent, expectedParent, visible }) => {
      const core = new LocalRuntimeCore(
        { adapters: { chatModel: { run: async () => ({ content: [] }) } } },
        [
          { id: "root", role: "user", content: "root" },
          { id: "tail", role: "assistant", content: "tail" },
        ],
      );
      const thread = new AssistantRuntimeImpl(core).thread;

      thread.append({
        ...parent,
        content: [{ type: "text", text: "new" }],
        startRun: false,
      });

      expect(
        thread.getState().messages.map((message) => message.content),
      ).toEqual(visible.map((text) => [{ type: "text", text }]));
      expect(thread.export().messages.at(-1)?.parentId).toBe(expectedParent);
    },
  );
});

describe("ThreadRuntime.append with an external store", () => {
  it("routes an explicit root parent to onEdit instead of onNew", async () => {
    const onNew = vi.fn(async () => {});
    const onEdit = vi.fn(async () => {});
    const core = new ExternalStoreRuntimeCore({
      messages: [
        {
          id: "old",
          role: "user",
          content: [{ type: "text", text: "old" }],
          createdAt: new Date(0),
          attachments: [],
          metadata: { custom: {} },
        },
      ],
      onNew,
      onEdit,
    });
    const thread = new AssistantRuntimeImpl(core).thread;

    thread.append({
      parentId: null,
      content: [{ type: "text", text: "new root" }],
      startRun: false,
    });

    await vi.waitFor(() =>
      expect(onEdit).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ parentId: null }),
      ),
    );
    expect(onNew).not.toHaveBeenCalled();
  });
});

describe("ThreadRuntime.append when the send rejects", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const rejectingWith = (error: unknown) =>
    vi.fn(async () => {
      throw error;
    });

  const threadWith = (callbacks: { onNew: ReturnType<typeof rejectingWith> }) =>
    new AssistantRuntimeImpl(
      new ExternalStoreRuntimeCore({ messages: [], ...callbacks }),
    ).thread;

  const settle = async (callback: ReturnType<typeof rejectingWith>) => {
    await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const silenceConsoleError = () =>
    vi.spyOn(console, "error").mockImplementation(() => {});

  it("logs a failed append instead of leaving an unhandled rejection", async () => {
    const consoleError = silenceConsoleError();
    const error = new Error("network down");
    const onNew = rejectingWith(error);

    threadWith({ onNew }).append({ content: [{ type: "text", text: "hi" }] });
    await settle(onNew);

    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      "[assistant-ui] Message append failed",
      error,
    );
  });

  it("stays silent for an undispatched append, which the composer owns", async () => {
    const consoleError = silenceConsoleError();
    const onNew = rejectingWith(new MessageNotSentError());

    threadWith({ onNew }).append({ content: [{ type: "text", text: "hi" }] });
    await settle(onNew);

    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe("ThreadRuntime state subscriptions", () => {
  it("tears down every source before reconnecting after an error", () => {
    const core = new ReadonlyThreadRuntimeCore();
    const cleanupError = new Error("thread cleanup failed");
    const threadCleanup = vi.fn(() => {
      throw cleanupError;
    });
    const itemCleanup = vi.fn();
    let threadSubscriptions = 0;
    let itemSubscriptions = 0;
    const path = {
      ref: "test.thread",
      threadSelector: { type: "main" as const },
    };
    const runtime = new ThreadRuntimeImpl(
      {
        path,
        getState: () => core,
        subscribe: () => {
          threadSubscriptions += 1;
          return threadCleanup;
        },
        outerSubscribe: () => () => {},
      } satisfies ThreadRuntimeCoreBinding,
      {
        path,
        getState: () => ({
          id: "test",
          remoteId: undefined,
          externalId: undefined,
          isMain: true,
          isRunning: false,
          status: "regular",
          title: undefined,
        }),
        subscribe: () => {
          itemSubscriptions += 1;
          return itemCleanup;
        },
      } satisfies ThreadListItemRuntimeBinding,
    );

    const unsubscribe = runtime.subscribe(() => {});
    expect(() => unsubscribe()).toThrow(cleanupError);
    expect(itemCleanup).toHaveBeenCalledOnce();

    runtime.subscribe(() => {});
    expect(threadSubscriptions).toBe(2);
    expect(itemSubscriptions).toBe(2);
  });
});

describe("ThreadRuntime model context", () => {
  it("notifies modelContextUpdate subscribers when the bound core is replaced", () => {
    const attached = new ExternalStoreRuntimeCore({
      messages: [],
      onNew: async () => {},
    });
    attached.registerModelContextProvider({
      getModelContext: () => ({
        tools: { search_docs: { parameters: z.object({}) } },
      }),
    });

    let core: ThreadRuntimeCore = EMPTY_THREAD_CORE;
    let notifyBinding!: () => void;
    const path = {
      ref: "test.thread",
      threadSelector: { type: "main" as const },
    };
    const runtime = new ThreadRuntimeImpl(
      {
        path,
        getState: () => core,
        subscribe: (callback) => {
          notifyBinding = callback;
          return () => {};
        },
        outerSubscribe: () => () => {},
      } satisfies ThreadRuntimeCoreBinding,
      {
        path,
        getState: () => ({
          id: "test",
          remoteId: undefined,
          externalId: undefined,
          isMain: true,
          isRunning: false,
          status: "regular",
          title: undefined,
        }),
        subscribe: () => () => {},
      } satisfies ThreadListItemRuntimeBinding,
    );

    const reads: string[][] = [];
    runtime.unstable_on("modelContextUpdate", () => {
      reads.push(Object.keys(runtime.getModelContext().tools ?? {}));
    });
    expect(runtime.getModelContext().tools).toBeUndefined();

    core = attached.threads.getMainThreadRuntimeCore();
    notifyBinding();

    expect(reads).toEqual([["search_docs"]]);
  });
});
