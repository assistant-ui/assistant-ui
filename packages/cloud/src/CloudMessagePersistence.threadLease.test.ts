import { describe, expect, it, vi } from "vitest";
import { CloudMessagePersistence } from "./CloudMessagePersistence";
import type { AssistantCloud } from "./AssistantCloud";

const createCloud = () => {
  const messages = {
    create: vi.fn(),
    update: vi.fn(),
    list: vi.fn().mockResolvedValue({ messages: [] }),
    delete: vi.fn(),
  };
  const cloud = { threads: { messages } } as unknown as AssistantCloud;
  return { cloud, messages };
};

describe("CloudMessagePersistence thread leases", () => {
  it("ignores ended message runs when reading reply state", () => {
    const { cloud } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);

    expect(
      persistence.runStateOf({ status: "ended", last_heartbeat_ms_ago: 0 }),
    ).toBeUndefined();
    expect(
      persistence.runStateOf(
        { status: "ended", last_heartbeat_ms_ago: 0 },
        30_000,
      ),
    ).toBeUndefined();
  });

  it("records the thread's run from the first page of a load", async () => {
    const { cloud, messages } = createCloud();
    const run = {
      status: "running",
      message_id: null,
      parent_id: "msg_u1",
      last_heartbeat_ms_ago: 1_000,
    };
    messages.list.mockResolvedValue({ messages: [], run });
    const persistence = new CloudMessagePersistence(cloud);
    expect(persistence.threadRunOf("t1")).toBeUndefined();
    await persistence.load("t1");
    expect(persistence.threadRunOf("t1")).toEqual({
      run,
      readAt: expect.any(Number),
    });

    messages.list.mockResolvedValue({ messages: [], run: null });
    await persistence.load("t1");
    expect(persistence.threadRunOf("t1")?.run).toBeNull();
  });

  it("keeps the run from the first page when later pages carry another", async () => {
    const { cloud, messages } = createCloud();
    const run = {
      status: "running",
      message_id: null,
      parent_id: "msg_1",
      last_heartbeat_ms_ago: 1_000,
    };
    const row = (id: string) => ({
      id,
      parent_id: null,
      height: 0,
      created_at: new Date(0),
      updated_at: new Date(0),
      format: "aui/v0",
      content: {},
    });
    messages.list
      .mockResolvedValueOnce({
        messages: [row("msg_2")],
        run,
        has_more: true,
        next_cursor: "msg_2",
      })
      .mockResolvedValueOnce({ messages: [row("msg_1")], run: null });
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.load("t1");

    expect(messages.list).toHaveBeenCalledTimes(2);
    expect(persistence.threadRunOf("t1")?.run).toEqual(run);
  });

  it("forgets the thread's run on reset", async () => {
    const { cloud, messages } = createCloud();
    messages.list.mockResolvedValue({
      messages: [],
      run: {
        status: "running",
        message_id: null,
        parent_id: null,
        last_heartbeat_ms_ago: 0,
      },
    });
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.load("t1");
    persistence.recordThreadRun("t2", null, 5);
    expect(persistence.threadRunOf("t2")).toEqual({ run: null, readAt: 5 });

    persistence.reset();
    expect(persistence.threadRunOf("t1")).toBeUndefined();
    expect(persistence.threadRunOf("t2")).toBeUndefined();
  });
});
