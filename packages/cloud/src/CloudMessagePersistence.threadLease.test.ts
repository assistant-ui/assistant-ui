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

  it("rejects with a clear error on a server without thread leases", async () => {
    const { cloud, runs } = createCloud();
    runs.open.mockRejectedValue(apiError(404));
    const persistence = new CloudMessagePersistence(cloud);
    await expect(persistence.beginRun("t1", "a1", null)).rejects.toThrow(
      /needs Assistant Cloud v0\.2\.11 or newer/,
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
});
