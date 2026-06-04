import { describe, it, expect, vi } from "vitest";
import { createMessageQueue } from "../runtime/queue/message-queue";
import type { AppendMessage } from "../types/message";

const msg = (text: string, extra?: Partial<AppendMessage>): AppendMessage => ({
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  createdAt: new Date(0),
  parentId: null,
  sourceId: null,
  runConfig: {},
  metadata: { custom: {} },
  ...extra,
});

describe("createMessageQueue", () => {
  it("runs immediately when idle and holds while running", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run });

    adapter.enqueue(msg("first"), { steer: false });
    expect(run).toHaveBeenCalledTimes(1);
    expect(adapter.items).toHaveLength(0);

    adapter.enqueue(msg("second"), { steer: false });
    expect(run).toHaveBeenCalledTimes(1);
    expect(adapter.items.map((i) => i.prompt)).toEqual(["second"]);

    notifyIdle();
    expect(run).toHaveBeenCalledTimes(2);
    expect(adapter.items).toHaveLength(0);
  });

  it("drains FIFO across multiple queued messages", () => {
    const order: string[] = [];
    const run = vi.fn((m: AppendMessage) =>
      order.push((m.content[0] as { text: string }).text),
    );
    const { adapter, notifyIdle } = createMessageQueue({ run });

    adapter.enqueue(msg("a"), { steer: false }); // runs now
    adapter.enqueue(msg("b"), { steer: false });
    adapter.enqueue(msg("c"), { steer: false });
    expect(adapter.items.map((i) => i.prompt)).toEqual(["b", "c"]);

    notifyIdle();
    notifyIdle();
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("hands the full original AppendMessage to the driver", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run });
    const attachments = [{ id: "x" }] as never;
    const runConfig = { custom: { k: 1 } };

    adapter.enqueue(msg("busy"), { steer: false });
    adapter.enqueue(msg("queued", { attachments, runConfig }), {
      steer: false,
    });
    notifyIdle();

    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ attachments, runConfig }),
      { steer: false },
    );
  });

  it("removes a queued message before it runs", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run });

    adapter.enqueue(msg("a"), { steer: false }); // runs now
    adapter.enqueue(msg("b"), { steer: false });
    adapter.enqueue(msg("c"), { steer: false });

    adapter.remove(adapter.items[0]!.id); // remove "b"
    expect(adapter.items.map((i) => i.prompt)).toEqual(["c"]);

    notifyIdle();
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: [{ type: "text", text: "c" }] }),
      { steer: false },
    );
  });

  it("clear() empties pending items", () => {
    const run = vi.fn();
    const { adapter } = createMessageQueue({ run });
    adapter.enqueue(msg("a"), { steer: false });
    adapter.enqueue(msg("b"), { steer: false });
    adapter.clear("cancel-run");
    expect(adapter.items).toHaveLength(0);
  });

  it("steers via cancel and suppresses the cancelled run's idle (no double-dequeue)", () => {
    const run = vi.fn();
    const cancel = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run, cancel });

    adapter.enqueue(msg("a"), { steer: false }); // running
    adapter.enqueue(msg("b"), { steer: false }); // queued
    adapter.enqueue(msg("steer-me"), { steer: true });

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: [{ type: "text", text: "steer-me" }],
      }),
      { steer: true },
    );
    const runsAfterSteer = run.mock.calls.length;

    // the cancelled run's settle must NOT advance the queue
    notifyIdle();
    expect(run).toHaveBeenCalledTimes(runsAfterSteer);

    // the steered run's real settle drains the rest
    notifyIdle();
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: [{ type: "text", text: "b" }] }),
      { steer: false },
    );
  });

  it("degrades steer to run-next when no cancel is available", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run }); // no cancel

    adapter.enqueue(msg("a"), { steer: false }); // running
    adapter.enqueue(msg("b"), { steer: false });
    adapter.enqueue(msg("urgent"), { steer: true });

    // no interrupt: "urgent" jumps the queue ahead of "b"
    expect(adapter.items.map((i) => i.prompt)).toEqual(["urgent", "b"]);

    notifyIdle();
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: [{ type: "text", text: "urgent" }] }),
      { steer: false },
    );
  });

  it("notifies subscribers on item changes", () => {
    const run = vi.fn();
    const { adapter, subscribe } = createMessageQueue({ run });
    const cb = vi.fn();
    subscribe(cb);

    adapter.enqueue(msg("a"), { steer: false }); // runs (1 setItems push + 1 pop)
    expect(cb).toHaveBeenCalled();
  });

  it("buffers when a run started outside the queue is marked busy", () => {
    const run = vi.fn();
    const { adapter, notifyBusy, notifyIdle } = createMessageQueue({ run });

    notifyBusy(); // e.g. a regenerate started without going through the queue
    adapter.enqueue(msg("a"), { steer: false });
    expect(run).not.toHaveBeenCalled();
    expect(adapter.items.map((i) => i.prompt)).toEqual(["a"]);

    notifyIdle(); // that run settled
    expect(run).toHaveBeenCalledTimes(1);
    expect(adapter.items).toHaveLength(0);
  });
});
