import { describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "../../runtimes/local/local-runtime-core";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import { ReadonlyThreadRuntimeCore } from "../../runtimes/readonly/ReadonlyThreadRuntimeCore";
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
