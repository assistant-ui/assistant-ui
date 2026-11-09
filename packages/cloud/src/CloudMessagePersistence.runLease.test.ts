import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudMessagePersistence } from "./CloudMessagePersistence";
import type { AssistantCloud } from "./AssistantCloud";
import { CloudAPIError } from "./AssistantCloudAPI";

const lease = {
  id: "lease_1",
  expires_at: new Date(30_000),
  ttl_ms: 30_000,
  heartbeat_interval_ms: 20_000,
};

const createCloud = () => {
  const messages = {
    create: vi.fn().mockResolvedValue({ message_id: "msg_1", lease }),
    update: vi.fn().mockResolvedValue({}),
    heartbeat: vi.fn().mockResolvedValue({
      expires_at: new Date(50_000),
      ttl_ms: 30_000,
      heartbeat_interval_ms: 20_000,
    }),
    list: vi.fn(),
    delete: vi.fn(),
  };
  const cloud = { threads: { messages } } as unknown as AssistantCloud;
  return { cloud, messages };
};

const running = { role: "assistant", status: { type: "running" } };
const done = { role: "assistant", content: [{ type: "text", text: "done" }] };

describe("CloudMessagePersistence run leases", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens a lease, heartbeats on the server's interval and closes it with the final write", async () => {
    const { cloud, messages } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);

    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    expect(messages.create).toHaveBeenCalledWith("t1", {
      parent_id: null,
      external_id: "local-a",
      format: "aui/v0",
      content: running,
      run: { status: "running" },
    });
    expect(persistence.hasOpenRun("local-a")).toBe(true);

    await vi.advanceTimersByTimeAsync(19_999);
    expect(messages.heartbeat).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(messages.heartbeat).toHaveBeenCalledWith("t1", "msg_1", {
      lease_id: "lease_1",
    });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(messages.heartbeat).toHaveBeenCalledTimes(2);

    await persistence.update("t1", "local-a", "aui/v0", done, "ended");
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      run: { lease_id: "lease_1", status: "ended" },
    });
    expect(persistence.hasOpenRun("local-a")).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(messages.heartbeat).toHaveBeenCalledTimes(2);
  });

  it("routes the runtime's final append of a leased message to a lease write", async () => {
    const { cloud, messages } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);

    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );
    await persistence.append("t1", "local-a", null, "aui/v0", done);

    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      run: { lease_id: "lease_1", status: "ended" },
    });
  });

  it("waits for an in-flight running append before writing the final answer", async () => {
    const { cloud, messages } = createCloud();
    let resolveCreate!: (value: unknown) => void;
    messages.create.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const persistence = new CloudMessagePersistence(cloud);

    const placeholder = persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );
    const final = persistence.append("t1", "local-a", null, "aui/v0", done);
    resolveCreate({ message_id: "msg_1", lease });
    await Promise.all([placeholder, final]);

    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      run: { lease_id: "lease_1", status: "ended" },
    });
  });

  it("checkpoints renew the lease and serialize behind earlier writes", async () => {
    const { cloud, messages } = createCloud();
    const order: string[] = [];
    messages.update.mockImplementation(async (_t, _m, body) => {
      order.push(body.run.status);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {};
    });
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    const checkpoint = persistence.update(
      "t1",
      "local-a",
      "aui/v0",
      running,
      "running",
    );
    const final = persistence.update("t1", "local-a", "aui/v0", done, "ended");
    await vi.advanceTimersByTimeAsync(20);
    await Promise.all([checkpoint, final]);

    expect(order).toEqual(["running", "ended"]);
    expect(persistence.hasOpenRun("local-a")).toBe(false);
  });

  it("remaps the local id when a superseded lease's write forks to a sibling", async () => {
    const { cloud, messages } = createCloud();
    messages.heartbeat.mockRejectedValueOnce(
      new CloudAPIError("superseded", 409, "run_superseded", {
        superseded_by: "msg_2",
      }),
    );
    messages.update.mockResolvedValueOnce({
      message_id: "msg_fork",
      forked_from: "msg_1",
    });
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    await vi.advanceTimersByTimeAsync(20_000);
    expect(messages.heartbeat).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(messages.heartbeat).toHaveBeenCalledTimes(1);

    await persistence.update("t1", "local-a", "aui/v0", running, "running");
    expect(persistence.getResolvedRemoteId("local-a")).toBe("msg_fork");
    await persistence.update("t1", "local-a", "aui/v0", done, "ended");
    expect(messages.update).toHaveBeenLastCalledWith("t1", "msg_fork", {
      content: done,
      run: { lease_id: "lease_1", status: "ended" },
    });
  });

  it("drops a checkpoint the server refuses because the run already ended", async () => {
    const { cloud, messages } = createCloud();
    messages.update.mockRejectedValueOnce(
      new CloudAPIError("ended", 409, "run_ended"),
    );
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    await expect(
      persistence.update("t1", "local-a", "aui/v0", running, "running"),
    ).resolves.toBeUndefined();
    expect(persistence.hasOpenRun("local-a")).toBe(false);

    await persistence.update("t1", "local-a", "aui/v0", done);
    expect(messages.update).toHaveBeenLastCalledWith("t1", "msg_1", {
      content: done,
    });
  });

  it("stops heartbeating when the server no longer knows the run", async () => {
    const { cloud, messages } = createCloud();
    messages.heartbeat.mockRejectedValueOnce(
      new CloudAPIError("ended", 409, "run_ended"),
    );
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    await vi.advanceTimersByTimeAsync(20_000);
    expect(persistence.hasOpenRun("local-a")).toBe(false);

    const gone = new CloudMessagePersistence(cloud);
    messages.heartbeat.mockRejectedValueOnce(new CloudAPIError("gone", 404));
    await gone.append("t1", "local-b", null, "aui/v0", running, "running");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(gone.hasOpenRun("local-b")).toBe(false);
  });

  it("keeps heartbeating through a network error", async () => {
    const { cloud, messages } = createCloud();
    messages.heartbeat.mockRejectedValueOnce(new TypeError("offline"));
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    await vi.advanceTimersByTimeAsync(40_000);
    expect(messages.heartbeat).toHaveBeenCalledTimes(2);
    expect(persistence.hasOpenRun("local-a")).toBe(true);
  });

  it("stores the message without a lease on a server that predates run leases", async () => {
    const { cloud, messages } = createCloud();
    messages.create
      .mockRejectedValueOnce(new CloudAPIError("bad request", 400))
      .mockResolvedValueOnce({ message_id: "msg_1" });
    const persistence = new CloudMessagePersistence(cloud);

    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    expect(messages.create).toHaveBeenLastCalledWith("t1", {
      parent_id: null,
      external_id: "local-a",
      format: "aui/v0",
      content: running,
    });
    expect(persistence.hasOpenRun("local-a")).toBe(false);
    expect(persistence.getResolvedRemoteId("local-a")).toBe("msg_1");
  });

  it("rethrows other create failures of a running append", async () => {
    const { cloud, messages } = createCloud();
    messages.create.mockRejectedValueOnce(new CloudAPIError("busy", 409));
    const persistence = new CloudMessagePersistence(cloud);

    await expect(
      persistence.append("t1", "local-a", null, "aui/v0", running, "running"),
    ).rejects.toThrow("busy");
  });

  it("rethrows a lease write failure that is not a refusal", async () => {
    const { cloud, messages } = createCloud();
    messages.update.mockRejectedValueOnce(new CloudAPIError("down", 503));
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    await expect(
      persistence.update("t1", "local-a", "aui/v0", done, "ended"),
    ).rejects.toThrow("down");
    expect(persistence.hasOpenRun("local-a")).toBe(true);
  });

  it("stops every heartbeat on reset", async () => {
    const { cloud, messages } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    persistence.reset();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(messages.heartbeat).not.toHaveBeenCalled();
  });

  it("moves the lease and mapping when the runtime renames the running message", async () => {
    const { cloud, messages } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "placeholder",
      null,
      "aui/v0",
      running,
      "running",
    );

    await persistence.rename("placeholder", "backend-id");
    expect(persistence.hasOpenRun("placeholder")).toBe(false);
    expect(persistence.hasOpenRun("backend-id")).toBe(true);
    expect(persistence.getResolvedRemoteId("backend-id")).toBe("msg_1");

    await vi.advanceTimersByTimeAsync(20_000);
    expect(messages.heartbeat).toHaveBeenCalledTimes(1);
    await persistence.append("t1", "backend-id", null, "aui/v0", done);
    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      run: { lease_id: "lease_1", status: "ended" },
    });

    await persistence.rename("missing", "other");
    expect(persistence.getResolvedRemoteId("other")).toBeUndefined();
    await persistence.append("t1", "plain", null, "aui/v0", done);
    await persistence.rename("plain", "renamed");
    expect(persistence.getResolvedRemoteId("renamed")).toBe("msg_1");
    expect(persistence.hasOpenRun("renamed")).toBe(false);
  });
});
