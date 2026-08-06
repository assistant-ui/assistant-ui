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

const prompts = (items: readonly { prompt: string }[]) =>
  items.map((i) => i.prompt);

describe("createMessageQueue", () => {
  it("runs immediately when idle and holds while running", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run });

    adapter.enqueue(msg("first"), { lane: "queue" });
    expect(run).toHaveBeenCalledTimes(1);
    expect(adapter.items).toHaveLength(0);

    adapter.enqueue(msg("second"), { lane: "queue" });
    expect(run).toHaveBeenCalledTimes(1);
    expect(prompts(adapter.items)).toEqual(["second"]);

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

    adapter.enqueue(msg("a"), { lane: "queue" }); // runs now
    adapter.enqueue(msg("b"), { lane: "queue" });
    adapter.enqueue(msg("c"), { lane: "queue" });
    expect(prompts(adapter.items)).toEqual(["b", "c"]);

    notifyIdle();
    notifyIdle();
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("hands the full original AppendMessage to the driver", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run });
    const attachments = [{ id: "x" }] as never;
    const runConfig = { custom: { k: 1 } };

    adapter.enqueue(msg("busy"), { lane: "queue" });
    adapter.enqueue(msg("queued", { attachments, runConfig }), {
      lane: "queue",
    });
    notifyIdle();

    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ attachments, runConfig }),
      { steer: false },
    );
  });

  it("projects text parts onto queue items", () => {
    const run = vi.fn();
    const { adapter, notifyBusy } = createMessageQueue({ run });
    notifyBusy();

    adapter.enqueue(msg("hello"), { lane: "queue" });
    expect(adapter.items[0]!.parts).toEqual([{ type: "text", text: "hello" }]);
    expect(adapter.items[0]!.prompt).toBe("hello");
  });

  it("projects files first, converting image parts to file parts", () => {
    const run = vi.fn();
    const { adapter, notifyBusy } = createMessageQueue({ run });
    notifyBusy();

    adapter.enqueue(
      msg("caption", {
        content: [
          { type: "text", text: "caption" },
          { type: "image", image: "https://example.com/cat.png" },
        ],
        attachments: [
          {
            id: "att1",
            type: "file",
            name: "doc.pdf",
            contentType: "application/pdf",
            status: { type: "complete" },
            content: [
              {
                type: "file",
                data: "data:application/pdf;base64,QQ==",
                mimeType: "application/pdf",
              },
            ],
          },
        ],
      }),
      { lane: "queue" },
    );

    expect(adapter.items[0]!.parts).toEqual([
      {
        type: "file",
        data: "https://example.com/cat.png",
        mimeType: "image/*",
      },
      {
        type: "file",
        data: "data:application/pdf;base64,QQ==",
        mimeType: "application/pdf",
      },
      { type: "text", text: "caption" },
    ]);
  });

  it("removes a queued message before it runs", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run });

    adapter.enqueue(msg("a"), { lane: "queue" }); // runs now
    adapter.enqueue(msg("b"), { lane: "queue" });
    adapter.enqueue(msg("c"), { lane: "queue" });

    adapter.remove(adapter.items[0]!.id); // remove "b"
    expect(prompts(adapter.items)).toEqual(["c"]);

    notifyIdle();
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: [{ type: "text", text: "c" }] }),
      { steer: false },
    );
  });

  it("edits a queued message in place, keeping id and position", () => {
    const run = vi.fn();
    const { adapter, notifyBusy } = createMessageQueue({ run });
    notifyBusy();

    adapter.enqueue(msg("a"), { lane: "queue" });
    adapter.enqueue(msg("b"), { lane: "queue" });
    const id = adapter.items[0]!.id;

    adapter.edit(id, msg("a2"));
    expect(prompts(adapter.items)).toEqual(["a2", "b"]);
    expect(adapter.items[0]!.id).toBe(id);
  });

  it("edit throws on an unknown queue item", () => {
    const { adapter } = createMessageQueue({ run: vi.fn() });
    expect(() => adapter.edit("nope", msg("x"))).toThrow(
      'Unknown queue item "nope"',
    );
  });

  it("steer-lane enqueue interrupts via cancel and suppresses the cancelled run's idle", () => {
    const run = vi.fn();
    const cancel = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run, cancel });

    adapter.enqueue(msg("a"), { lane: "queue" }); // running
    adapter.enqueue(msg("b"), { lane: "queue" }); // queued
    adapter.enqueue(msg("steer-me"), { lane: "steer" });

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

  it("steer-lane enqueue without cancel dispatches next, before the queue lane", () => {
    const run = vi.fn();
    const { adapter, notifyIdle } = createMessageQueue({ run }); // no cancel

    adapter.enqueue(msg("a"), { lane: "queue" }); // running
    adapter.enqueue(msg("b"), { lane: "queue" });
    adapter.enqueue(msg("urgent"), { lane: "steer" });

    expect(prompts(adapter.steerItems)).toEqual(["urgent"]);
    expect(prompts(adapter.items)).toEqual(["b"]);

    notifyIdle();
    expect(run).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: [{ type: "text", text: "urgent" }] }),
      { steer: false },
    );
  });

  it("advance pops the steer lane before the queue lane", () => {
    const order: string[] = [];
    const run = vi.fn((m: AppendMessage) =>
      order.push((m.content[0] as { text: string }).text),
    );
    const { adapter, notifyBusy, notifyIdle } = createMessageQueue({ run });

    notifyBusy();
    adapter.enqueue(msg("q1"), { lane: "queue" });
    adapter.enqueue(msg("s1"), { lane: "steer" });
    adapter.enqueue(msg("s2"), { lane: "steer" });

    notifyIdle();
    notifyIdle();
    notifyIdle();
    expect(order).toEqual(["s1", "s2", "q1"]);
  });

  describe("move", () => {
    const setup = () => {
      const run = vi.fn();
      const queue = createMessageQueue({ run });
      queue.notifyBusy();
      queue.adapter.enqueue(msg("a"), { lane: "queue" });
      queue.adapter.enqueue(msg("b"), { lane: "queue" });
      queue.adapter.enqueue(msg("c"), { lane: "queue" });
      queue.adapter.enqueue(msg("s"), { lane: "steer" });
      const id = (prompt: string) =>
        [...queue.adapter.steerItems, ...queue.adapter.items].find(
          (i) => i.prompt === prompt,
        )!.id;
      return { ...queue, id, run };
    };

    it("keeps position within the same lane when no placement is given", () => {
      const { adapter, id } = setup();
      adapter.move(id("b"), {});
      expect(prompts(adapter.items)).toEqual(["a", "b", "c"]);
    });

    it("moves to the destination lane tail on lane change without placement", () => {
      const { adapter, id } = setup();
      adapter.move(id("s"), { lane: "queue" });
      expect(prompts(adapter.steerItems)).toEqual([]);
      expect(prompts(adapter.items)).toEqual(["a", "b", "c", "s"]);
    });

    it("moves into the steer lane without interrupting when no cancel is available", () => {
      const { adapter, id } = setup();
      adapter.move(id("b"), { lane: "steer" });
      expect(prompts(adapter.steerItems)).toEqual(["s", "b"]);
      expect(prompts(adapter.items)).toEqual(["a", "c"]);
    });

    it("insertAfter: null moves to the front of the lane", () => {
      const { adapter, id } = setup();
      adapter.move(id("c"), { insertAfter: null });
      expect(prompts(adapter.items)).toEqual(["c", "a", "b"]);
    });

    it("insertBefore: null moves to the end of the lane", () => {
      const { adapter, id } = setup();
      adapter.move(id("a"), { insertBefore: null });
      expect(prompts(adapter.items)).toEqual(["b", "c", "a"]);
    });

    it("insertAfter an anchor id places the item right after it", () => {
      const { adapter, id } = setup();
      adapter.move(id("a"), { insertAfter: id("b") });
      expect(prompts(adapter.items)).toEqual(["b", "a", "c"]);
    });

    it("insertBefore an anchor id places the item right before it", () => {
      const { adapter, id } = setup();
      adapter.move(id("c"), { insertBefore: id("b") });
      expect(prompts(adapter.items)).toEqual(["a", "c", "b"]);
    });

    it("accepts an adjacent insertAfter/insertBefore pair", () => {
      const { adapter, id } = setup();
      adapter.move(id("c"), { insertAfter: id("a"), insertBefore: id("b") });
      expect(prompts(adapter.items)).toEqual(["a", "c", "b"]);
    });

    it("throws when the insertAfter/insertBefore pair is not adjacent", () => {
      const { adapter, id } = setup();
      expect(() =>
        adapter.move(id("b"), { insertAfter: id("c"), insertBefore: id("a") }),
      ).toThrow("not adjacent");
    });

    it("throws on an unknown queue item", () => {
      const { adapter } = setup();
      expect(() => adapter.move("nope", {})).toThrow(
        'Unknown queue item "nope"',
      );
    });

    it("throws on an unknown anchor", () => {
      const { adapter, id } = setup();
      expect(() => adapter.move(id("a"), { insertAfter: "nope" })).toThrow(
        'Unknown anchor "nope"',
      );
    });

    it("throws on a self-anchor", () => {
      const { adapter, id } = setup();
      expect(() => adapter.move(id("a"), { insertAfter: id("a") })).toThrow(
        "cannot anchor itself",
      );
    });

    it("throws when the anchor lives in a different lane", () => {
      const { adapter, id } = setup();
      expect(() =>
        adapter.move(id("s"), { lane: "queue", insertAfter: id("s") }),
      ).toThrow("cannot anchor itself");
      expect(() => adapter.move(id("a"), { insertAfter: id("s") })).toThrow(
        "Unknown anchor",
      );
    });

    it("interrupts via cancel when moving into the steer lane mid-run", () => {
      const run = vi.fn();
      const cancel = vi.fn();
      const { adapter, notifyIdle } = createMessageQueue({ run, cancel });

      adapter.enqueue(msg("a"), { lane: "queue" }); // running
      adapter.enqueue(msg("b"), { lane: "queue" });
      adapter.enqueue(msg("c"), { lane: "queue" });

      adapter.move(adapter.items[1]!.id, { lane: "steer" }); // "c"
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: [{ type: "text", text: "c" }] }),
        { steer: true },
      );
      expect(prompts(adapter.items)).toEqual(["b"]);

      // cancelled run's settle is swallowed
      notifyIdle();
      expect(run).toHaveBeenCalledTimes(2);
    });

    it("validates anchors mid-run instead of interrupting past them", () => {
      const run = vi.fn();
      const cancel = vi.fn();
      const { adapter } = createMessageQueue({ run, cancel });

      adapter.enqueue(msg("a"), { lane: "queue" }); // running
      adapter.enqueue(msg("b"), { lane: "queue" });
      const bId = adapter.items[0]!.id;

      expect(() =>
        adapter.move(bId, { lane: "steer", insertAfter: "nope" }),
      ).toThrow('Unknown anchor "nope"');
      expect(() =>
        adapter.move(bId, { lane: "steer", insertAfter: bId }),
      ).toThrow("cannot anchor itself");
      expect(cancel).not.toHaveBeenCalled();
      expect(run).toHaveBeenCalledTimes(1);
    });

    it("places an anchored move into the steer lane mid-run without interrupting", () => {
      const run = vi.fn();
      const cancel = vi.fn();
      const { adapter, notifyIdle } = createMessageQueue({ run, cancel });

      adapter.enqueue(msg("a"), { lane: "queue" }); // running
      adapter.enqueue(msg("b"), { lane: "queue" });
      adapter.enqueue(msg("c"), { lane: "queue" });

      adapter.move(adapter.items[1]!.id, { lane: "steer", insertAfter: null }); // "c"
      expect(cancel).not.toHaveBeenCalled();
      expect(run).toHaveBeenCalledTimes(1);
      expect(prompts(adapter.steerItems)).toEqual(["c"]);
      expect(prompts(adapter.items)).toEqual(["b"]);

      // the placed item dispatches first once the live run settles
      notifyIdle();
      expect(run).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: [{ type: "text", text: "c" }] }),
        { steer: false },
      );
    });
  });

  it("notifies subscribers on item changes", () => {
    const run = vi.fn();
    const { adapter, subscribe } = createMessageQueue({ run });
    const cb = vi.fn();
    subscribe(cb);

    adapter.enqueue(msg("a"), { lane: "queue" }); // runs (1 setLanes push + 1 pop)
    expect(cb).toHaveBeenCalled();
  });

  it("buffers when a run started outside the queue is marked busy", () => {
    const run = vi.fn();
    const { adapter, notifyBusy, notifyIdle } = createMessageQueue({ run });

    notifyBusy(); // e.g. a regenerate started without going through the queue
    adapter.enqueue(msg("a"), { lane: "queue" });
    expect(run).not.toHaveBeenCalled();
    expect(prompts(adapter.items)).toEqual(["a"]);

    notifyIdle(); // that run settled
    expect(run).toHaveBeenCalledTimes(1);
    expect(adapter.items).toHaveLength(0);
  });
});
