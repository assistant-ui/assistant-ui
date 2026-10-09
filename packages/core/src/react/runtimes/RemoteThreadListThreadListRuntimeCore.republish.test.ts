import { describe, expect, it } from "vitest";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";
import { ThreadListRuntimeImpl } from "../../runtime/api/thread-list-runtime";
import { ReadonlyThreadRuntimeCore } from "../../runtimes/readonly/ReadonlyThreadRuntimeCore";
import {
  contextProvider,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { ThreadMessage } from "../../types/message";

const message = (id: string): ThreadMessage =>
  ({
    id,
    role: "user",
    content: [{ type: "text", text: id }],
    createdAt: new Date(0),
    attachments: [],
    metadata: { custom: {} },
  }) as unknown as ThreadMessage;

const setup = () => {
  const core = new RemoteThreadListThreadListRuntimeCore(
    { adapter: makeAdapter(), runtimeHook: () => ({}) as never },
    contextProvider,
  );
  const hookManager = (
    core as unknown as {
      _hookManager: {
        _publishThreadRuntime: (
          id: string,
          runtime: ReadonlyThreadRuntimeCore,
          generation: number,
        ) => void;
        instances: Map<string, { generation: number }>;
      };
    }
  )._hookManager;
  const threadId = core.mainThreadId!;
  const publish = (runtime: ReadonlyThreadRuntimeCore) =>
    hookManager._publishThreadRuntime(
      threadId,
      runtime,
      hookManager.instances.get(threadId)!.generation,
    );
  return { core, publish };
};

describe("RemoteThreadListThreadListRuntimeCore republish", () => {
  it("keeps the subscribed main thread state on the republished core", async () => {
    const { core, publish } = setup();
    const first = new ReadonlyThreadRuntimeCore();
    first.setMessages([message("m1")]);
    publish(first);

    const thread = new ThreadListRuntimeImpl(core).main;
    thread.subscribe(() => {});
    expect(thread.getState().messages.map((m) => m.id)).toEqual(["m1"]);

    const second = new ReadonlyThreadRuntimeCore();
    second.setMessages([message("m2")]);
    publish(second);
    await Promise.resolve();

    const ids = thread.getState().messages.map((m) => m.id);
    expect(ids).toEqual(["m2"]);
    for (const id of ids) {
      expect(() => thread.getMessageById(id).getState()).not.toThrow();
    }
  });

  it("notifies thread subscribers when the core is republished", async () => {
    const { core, publish } = setup();
    publish(new ReadonlyThreadRuntimeCore());

    const thread = new ThreadListRuntimeImpl(core).main;
    let notified = 0;
    thread.subscribe(() => notified++);

    const next = new ReadonlyThreadRuntimeCore();
    next.setMessages([message("m1")]);
    publish(next);
    await Promise.resolve();

    expect(notified).toBeGreaterThan(0);
    expect(thread.getState().messages.map((m) => m.id)).toEqual(["m1"]);
  });
});
