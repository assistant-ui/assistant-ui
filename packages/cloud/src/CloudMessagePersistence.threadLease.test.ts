import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudMessagePersistence } from "./CloudMessagePersistence";
import type { AssistantCloud } from "./AssistantCloud";
import { CloudAPIError } from "./AssistantCloudAPI";

const lease = { lease_id: "lease_1", heartbeat_interval_ms: 20_000 };

const apiError = (status: number, code?: string) =>
  new CloudAPIError(code ?? `http ${status}`, status, code);

const createCloud = () => {
  const messages = {
    create: vi.fn().mockResolvedValue({ message_id: "msg_a" }),
    update: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ messages: [] }),
    delete: vi.fn(),
  };
  const runs = {
    open: vi.fn().mockResolvedValue(lease),
    heartbeat: vi.fn().mockResolvedValue({ heartbeat_interval_ms: 20_000 }),
    end: vi.fn().mockResolvedValue(undefined),
  };
  const cloud = { threads: { messages, runs } } as unknown as AssistantCloud;
  return { cloud, messages, runs };
};

const partial = {
  role: "assistant",
  content: [{ type: "text", text: "half" }],
};
const done = { role: "assistant", content: [{ type: "text", text: "all" }] };

describe("CloudMessagePersistence thread leases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the thread's lease without storing a row, then the first write stores the reply as the holder", async () => {
    const { cloud, messages, runs } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);
    persistence.record("u1", "msg_u1");

    expect(await persistence.beginRun("t1", "a1", "u1")).toBe(true);
    expect(runs.open).toHaveBeenCalledWith("t1", { parent_id: "msg_u1" });
    expect(messages.create).not.toHaveBeenCalled();
    expect(persistence.isPersisted("a1")).toBe(false);
    expect(persistence.hasOpenRun("a1")).toBe(true);

    await vi.advanceTimersByTimeAsync(20_000);
    expect(runs.heartbeat).toHaveBeenCalledWith("t1", "lease_1");

    await persistence.append("t1", "a1", "u1", "aui/v0", partial, "running");
    expect(messages.create).toHaveBeenCalledWith("t1", {
      parent_id: "msg_u1",
      external_id: "a1",
      format: "aui/v0",
      content: partial,
      lease_id: "lease_1",
    });
    expect(await persistence.getRemoteId("a1")).toBe("msg_a");

    await persistence.append("t1", "a1", "u1", "aui/v0", done, "done");
    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_a", {
      content: done,
      lease_id: "lease_1",
    });
    expect(runs.end).toHaveBeenCalledWith("t1", "lease_1", { reason: "done" });
    expect(persistence.hasOpenRun("a1")).toBe(false);
  });

  it("keeps heartbeating after renaming a reply before its first append", async () => {
    const { cloud, messages, runs } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);

    await persistence.beginRun("t1", "a1", null);
    await persistence.rename("a1", "a2");

    expect(persistence.hasOpenRun("a1")).toBe(false);
    expect(persistence.hasOpenRun("a2")).toBe(true);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(runs.heartbeat).toHaveBeenCalledExactlyOnceWith("t1", "lease_1");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(runs.heartbeat).toHaveBeenCalledTimes(2);
    expect(messages.create).not.toHaveBeenCalled();
  });

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

  it("rejects with a clear error on a server without thread leases", async () => {
    const { cloud, runs } = createCloud();
    runs.open.mockRejectedValue(apiError(404));
    const persistence = new CloudMessagePersistence(cloud);
    await expect(persistence.beginRun("t1", "a1", null)).rejects.toThrow(
      /needs Assistant Cloud v0\.2\.12 or newer/,
    );
    expect(persistence.hasOpenRun("a1")).toBe(false);
  });

  it("drops the reply when a newer run superseded the lease before the first write", async () => {
    const { cloud, messages, runs } = createCloud();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    messages.create.mockRejectedValue(apiError(409, "run_ended"));
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.beginRun("t1", "a1", null);

    await persistence.append("t1", "a1", null, "aui/v0", partial, "running");
    expect(persistence.isPersisted("a1")).toBe(false);
    expect(persistence.hasOpenRun("a1")).toBe(false);

    await persistence.append("t1", "a1", null, "aui/v0", done, "done");
    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(runs.end).not.toHaveBeenCalled();
    warn.mockRestore();
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
  it("keeps the stored reply mapped when ending its run fails after the first write", async () => {
    const { cloud, messages, runs } = createCloud();
    runs.end.mockRejectedValueOnce(apiError(503));
    const persistence = new CloudMessagePersistence(cloud);

    await persistence.beginRun("t1", "a1", null);
    await expect(
      persistence.append("t1", "a1", null, "aui/v0", done, "done"),
    ).rejects.toThrow("http 503");
    expect(await persistence.getRemoteId("a1")).toBe("msg_a");

    await persistence.update("t1", "a1", "aui/v0", done);
    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_a", {
      content: done,
    });
  });

  it("stores nothing when a reset lands while a running reply's lease opens", async () => {
    const { cloud, messages, runs } = createCloud();
    let resolveOpen!: (value: typeof lease) => void;
    runs.open.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOpen = resolve;
      }),
    );
    const persistence = new CloudMessagePersistence(cloud);

    const first = persistence.append(
      "t1",
      "a1",
      null,
      "aui/v0",
      partial,
      "running",
    );
    const final = persistence.append("t1", "a1", null, "aui/v0", done, "done");
    persistence.reset();
    resolveOpen(lease);
    await Promise.all([first, final]);

    expect(messages.create).not.toHaveBeenCalled();
    expect(persistence.isPersisted("a1")).toBe(false);
    expect(persistence.hasOpenRun("a1")).toBe(false);
  });
  it("passes an unknown thread's 404 through instead of asking for a newer server", async () => {
    const { cloud, runs } = createCloud();
    runs.open.mockRejectedValueOnce(apiError(404, "Thread not found"));
    const persistence = new CloudMessagePersistence(cloud);

    const error = await persistence.beginRun("t1", "a1", null).catch((e) => e);
    expect(error).toBeInstanceOf(CloudAPIError);
    expect(error.code).toBe("Thread not found");
  });
});
