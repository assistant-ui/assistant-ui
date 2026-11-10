import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudMessagePersistence } from "./CloudMessagePersistence";
import type { AssistantCloud } from "./AssistantCloud";
import { CloudAPIError } from "./AssistantCloudAPI";
import {
  createFormattedPersistence,
  type MessageFormatAdapter,
} from "./FormattedCloudPersistence";

const run = {
  lease_id: "lease_1",
  heartbeat_interval_ms: 20_000,
};

const createCloud = () => {
  const messages = {
    create: vi.fn().mockResolvedValue({ message_id: "msg_1", run }),
    update: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    delete: vi.fn(),
  };
  const runs = {
    heartbeat: vi.fn().mockResolvedValue({
      heartbeat_interval_ms: 20_000,
    }),
    end: vi.fn().mockResolvedValue(undefined),
    open: vi.fn(),
  };
  const cloud = { threads: { messages, runs } } as unknown as AssistantCloud;
  return { cloud, messages, runs };
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

  it("opens a run, heartbeats on the server's interval and ends it after the final write", async () => {
    const { cloud, messages, runs } = createCloud();
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
      open_run: true,
    });
    expect(persistence.hasOpenRun("local-a")).toBe(true);

    await vi.advanceTimersByTimeAsync(19_999);
    expect(runs.heartbeat).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(runs.heartbeat).toHaveBeenCalledWith("t1", "lease_1");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(runs.heartbeat).toHaveBeenCalledTimes(2);

    await persistence.update("t1", "local-a", "aui/v0", done, "done");
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      lease_id: "lease_1",
    });
    expect(runs.end).toHaveBeenCalledWith("t1", "lease_1", { reason: "done" });
    expect(persistence.hasOpenRun("local-a")).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(runs.heartbeat).toHaveBeenCalledTimes(2);
  });

  it("routes the runtime's final append of a leased message to a lease write and an end", async () => {
    const { cloud, messages, runs } = createCloud();
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
      lease_id: "lease_1",
    });
    expect(runs.end).toHaveBeenCalledWith("t1", "lease_1", { reason: "done" });
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
    const final = persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      done,
      "cancelled",
    );
    resolveCreate({ message_id: "msg_1", run });
    await Promise.all([placeholder, final]);

    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      lease_id: "lease_1",
    });
  });

  it("checkpoints renew the lease and serialize behind earlier writes", async () => {
    const { cloud, messages, runs } = createCloud();
    const order: string[] = [];
    messages.update.mockImplementation(async (_t, _m, body) => {
      order.push(`write:${body.content.text ?? "final"}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    runs.end.mockImplementation(async () => {
      order.push("end");
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
      { text: "partial" },
      "running",
    );
    const final = persistence.update("t1", "local-a", "aui/v0", done, "error");
    await vi.advanceTimersByTimeAsync(20);
    await Promise.all([checkpoint, final]);

    expect(order).toEqual(["write:partial", "write:final", "end"]);
    expect(runs.end).toHaveBeenCalledWith("t1", "lease_1", {
      reason: "error",
    });
  });

  it.each([
    ["run_ended", new CloudAPIError("ended", 409, "run_ended")],
    ["lease_mismatch", new CloudAPIError("mismatch", 409, "lease_mismatch")],
  ])(
    "closes the run and drops later writes when a write answers %s",
    async (_name, error) => {
      const { cloud, messages, runs } = createCloud();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      messages.update.mockRejectedValueOnce(error);
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
      expect(persistence.getResolvedRemoteId("local-a")).toBe("msg_1");

      await persistence.update("t1", "local-a", "aui/v0", done, "done");
      await persistence.update("t1", "local-a", "aui/v0", done);
      expect(messages.update).toHaveBeenCalledTimes(1);
      expect(runs.end).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    },
  );

  it("keeps a plain final write after the run's own end closed the lease", async () => {
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
    await persistence.update("t1", "local-a", "aui/v0", done, "cancelled");
    await persistence.update("t1", "local-a", "aui/v0", done);
    expect(messages.update).toHaveBeenLastCalledWith("t1", "msg_1", {
      content: done,
    });

    // A runtime that appends its settled message after the lease closed rewrites the row instead of storing a second one.
    await persistence.append("t1", "local-a", null, "aui/v0", done);
    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(messages.update).toHaveBeenCalledTimes(3);
    expect(messages.update).toHaveBeenLastCalledWith("t1", "msg_1", {
      content: done,
    });
  });

  it("schedules heartbeats from the server's interval, not a client TTL", async () => {
    const { cloud, messages, runs } = createCloud();
    messages.create.mockResolvedValueOnce({
      message_id: "msg_1",
      run: {
        lease_id: "lease_1",
        heartbeat_interval_ms: 20_000,
      },
    });
    runs.heartbeat.mockResolvedValueOnce({
      heartbeat_interval_ms: 45_000,
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

    await vi.advanceTimersByTimeAsync(19_999);
    expect(runs.heartbeat).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(runs.heartbeat).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(44_999);
    expect(runs.heartbeat).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(runs.heartbeat).toHaveBeenCalledTimes(2);
    expect(persistence.hasOpenRun("local-a")).toBe(true);
  });

  it("tolerates a refused end but rethrows a server failure", async () => {
    const { cloud, runs } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);
    runs.end.mockRejectedValueOnce(
      new CloudAPIError("Run not found", 404, "not_found"),
    );
    await persistence.append("t1", "a", null, "aui/v0", running, "running");
    await expect(
      persistence.update("t1", "a", "aui/v0", done, "done"),
    ).resolves.toBeUndefined();

    runs.end.mockRejectedValueOnce(new CloudAPIError("down", 503));
    await persistence.append("t1", "b", null, "aui/v0", running, "running");
    await expect(
      persistence.update("t1", "b", "aui/v0", done, "done"),
    ).rejects.toThrow("down");
  });

  it("stops heartbeating when the server no longer knows the run", async () => {
    const { cloud, runs } = createCloud();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    runs.heartbeat.mockRejectedValueOnce(
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
    runs.heartbeat.mockRejectedValueOnce(
      new CloudAPIError("Run not found", 404, "not_found"),
    );
    await gone.append("t1", "local-b", null, "aui/v0", running, "running");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(gone.hasOpenRun("local-b")).toBe(false);
    vi.mocked(console.warn).mockRestore();
  });

  it("keeps writing a run that comes back late after a long quiet stretch", async () => {
    const { cloud, messages, runs } = createCloud();
    runs.heartbeat.mockRejectedValueOnce(new TypeError("offline"));
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append("t1", "a", null, "aui/v0", running, "running");

    await vi.advanceTimersByTimeAsync(120_000);
    expect(persistence.hasOpenRun("a")).toBe(true);
    await persistence.update("t1", "a", "aui/v0", done, "done");
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      lease_id: "lease_1",
    });
    expect(runs.end).toHaveBeenCalledWith("t1", "lease_1", { reason: "done" });
  });

  it("reads a running lease as stale once it went staleAfter without a beat", () => {
    const { cloud } = createCloud();
    const persistence = new CloudMessagePersistence(cloud);
    expect(
      persistence.runStateOf({
        status: "running",
        last_heartbeat_ms_ago: 5_000,
      }),
    ).toEqual({ status: "in-progress", staleInMs: 25_000 });
    expect(
      persistence.runStateOf(
        { status: "running", last_heartbeat_ms_ago: 5_000 },
        25_000,
      ),
    ).toEqual({ status: "stale" });
    expect(
      persistence.runStateOf({
        status: "ended",
        last_heartbeat_ms_ago: 90_000,
      }),
    ).toBeUndefined();
    expect(persistence.runStateOf(undefined)).toBeUndefined();

    const patient = new CloudMessagePersistence(cloud, { staleAfter: 120_000 });
    expect(
      patient.runStateOf({ status: "running", last_heartbeat_ms_ago: 60_000 }),
    ).toEqual({ status: "in-progress", staleInMs: 60_000 });
  });

  it("keeps heartbeating through a network error", async () => {
    const { cloud, runs } = createCloud();
    runs.heartbeat.mockRejectedValueOnce(new TypeError("offline"));
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
    expect(runs.heartbeat).toHaveBeenCalledTimes(2);
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
    messages.create.mockRejectedValueOnce(
      new CloudAPIError("busy", 409, "run_in_progress"),
    );
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
      persistence.update("t1", "local-a", "aui/v0", done, "done"),
    ).rejects.toThrow("down");
    expect(persistence.hasOpenRun("local-a")).toBe(true);
  });

  it("stops every heartbeat on reset", async () => {
    const { cloud, runs } = createCloud();
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
    expect(runs.heartbeat).not.toHaveBeenCalled();
  });

  it("moves the lease and mapping when the runtime renames the running message", async () => {
    const { cloud, messages, runs } = createCloud();
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
    expect(runs.heartbeat).toHaveBeenCalledTimes(1);
    await persistence.append("t1", "backend-id", null, "aui/v0", done);
    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
      content: done,
      lease_id: "lease_1",
    });

    await persistence.rename("missing", "other");
    expect(persistence.getResolvedRemoteId("other")).toBeUndefined();
    await persistence.append("t1", "plain", null, "aui/v0", done);
    await persistence.rename("plain", "renamed");
    expect(persistence.getResolvedRemoteId("renamed")).toBe("msg_1");
    expect(persistence.hasOpenRun("renamed")).toBe(false);
  });

  describe("through a format adapter", () => {
    type UIMessage = { id: string; parts: { text: string }[] };
    const adapter: MessageFormatAdapter<UIMessage, Record<string, unknown>> = {
      format: "ai-sdk/v6",
      encode: ({ message }) => ({ parts: message.parts }),
      decode: (stored) => ({
        parentId: stored.parent_id,
        message: {
          id: stored.id,
          parts: stored.content.parts as UIMessage["parts"],
        },
      }),
      getId: (message) => message.id,
    };
    const partial = { id: "ui-1", parts: [{ text: "hel" }] };
    const final = { id: "ui-1", parts: [{ text: "hello" }] };

    it("opens a run on a running append, writes as the lease holder and ends it on the final write", async () => {
      const { cloud, messages, runs } = createCloud();
      const formatted = createFormattedPersistence(
        new CloudMessagePersistence(cloud),
        adapter,
      );

      await formatted.append(
        "t1",
        { parentId: null, message: partial },
        "running",
      );
      expect(messages.create).toHaveBeenCalledWith("t1", {
        parent_id: null,
        external_id: "ui-1",
        format: "ai-sdk/v6",
        content: { parts: partial.parts },
        open_run: true,
      });

      await formatted.update!(
        "t1",
        { parentId: null, message: partial },
        "ui-1",
        "running",
      );
      expect(messages.update).toHaveBeenLastCalledWith("t1", "msg_1", {
        content: { parts: partial.parts },
        lease_id: "lease_1",
      });
      expect(runs.end).not.toHaveBeenCalled();

      await formatted.update!(
        "t1",
        { parentId: null, message: final },
        "ui-1",
        "done",
      );
      expect(messages.update).toHaveBeenLastCalledWith("t1", "msg_1", {
        content: { parts: final.parts },
        lease_id: "lease_1",
      });
      expect(runs.end).toHaveBeenCalledWith("t1", "lease_1", {
        reason: "done",
      });
    });

    it("ends the lease on a settled append without a phase", async () => {
      const { cloud, messages, runs } = createCloud();
      const formatted = createFormattedPersistence(
        new CloudMessagePersistence(cloud),
        adapter,
      );
      await formatted.append(
        "t1",
        { parentId: null, message: partial },
        "running",
      );
      await formatted.append("t1", { parentId: null, message: final });

      expect(messages.create).toHaveBeenCalledTimes(1);
      expect(messages.update).toHaveBeenCalledWith("t1", "msg_1", {
        content: { parts: final.parts },
        lease_id: "lease_1",
      });
      expect(runs.end).toHaveBeenCalledWith("t1", "lease_1", {
        reason: "done",
      });
    });
  });
});
