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
  expires_in_ms: 90_000,
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
      expires_in_ms: 90_000,
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

const superseded = (forkId: string) =>
  new CloudAPIError("superseded", 409, "superseded", {
    message_id: forkId,
    forked_from: "msg_1",
  });

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

  it("stores a superseded run's write once on the fork and drops every later write", async () => {
    const { cloud, messages, runs } = createCloud();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    messages.update.mockRejectedValueOnce(superseded("msg_fork"));
    const persistence = new CloudMessagePersistence(cloud);
    await persistence.append(
      "t1",
      "local-a",
      null,
      "aui/v0",
      running,
      "running",
    );

    await persistence.update(
      "t1",
      "local-a",
      "aui/v0",
      { text: "partial" },
      "running",
    );
    expect(persistence.getResolvedRemoteId("local-a")).toBe("msg_fork");
    expect(persistence.hasOpenRun("local-a")).toBe(false);

    await persistence.update("t1", "local-a", "aui/v0", running, "running");
    await persistence.update("t1", "local-a", "aui/v0", done, "done");
    await persistence.update("t1", "local-a", "aui/v0", done);
    await persistence.append("t1", "local-a", null, "aui/v0", done);
    expect(messages.update).toHaveBeenCalledTimes(1);
    expect(messages.create).toHaveBeenCalledTimes(1);
    expect(runs.end).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(runs.heartbeat).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it.each([
    ["run_stale", new CloudAPIError("stale", 409, "run_stale")],
    [
      "superseded after the fork",
      new CloudAPIError("superseded", 409, "superseded", {
        superseded_by: "msg_2",
      }),
    ],
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

  it("drops the final write of a run the server reported stale on a heartbeat", async () => {
    const { cloud, messages, runs } = createCloud();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    runs.heartbeat.mockRejectedValueOnce(
      new CloudAPIError("stale", 409, "run_stale"),
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
    await vi.advanceTimersByTimeAsync(60_000);
    expect(runs.heartbeat).toHaveBeenCalledTimes(1);

    await persistence.append("t1", "local-a", null, "aui/v0", done);
    await persistence.update("t1", "local-a", "aui/v0", done, "done");
    expect(messages.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

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
        expires_in_ms: 90_000,
        heartbeat_interval_ms: 20_000,
      },
    });
    runs.heartbeat.mockResolvedValueOnce({
      expires_in_ms: 90_000,
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
      new CloudAPIError("superseded", 409, "superseded"),
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
    runs.heartbeat.mockRejectedValueOnce(new CloudAPIError("gone", 404));
    await gone.append("t1", "local-b", null, "aui/v0", running, "running");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(gone.hasOpenRun("local-b")).toBe(false);

    const resumed = new CloudMessagePersistence(cloud);
    runs.heartbeat.mockRejectedValueOnce(
      new CloudAPIError("superseded", 409, "superseded", {
        superseded_by: "msg_2",
      }),
    );
    await resumed.append("t1", "local-c", null, "aui/v0", running, "running");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(resumed.hasOpenRun("local-c")).toBe(false);
    vi.mocked(console.warn).mockRestore();
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

  describe("on pagehide", () => {
    let page: EventTarget;
    beforeEach(() => {
      page = new EventTarget();
      vi.stubGlobal("window", page);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });
    const pageEvent = (type: string, persisted: boolean) => {
      const event = new Event(type);
      Object.defineProperty(event, "persisted", { value: persisted });
      return event;
    };
    const hide = (persisted = false) =>
      page.dispatchEvent(pageEvent("pagehide", persisted));
    const show = (persisted: boolean) =>
      page.dispatchEvent(pageEvent("pageshow", persisted));

    it("ends the runs this tab holds as interrupted with a keepalive request", async () => {
      const { cloud, messages, runs } = createCloud();
      messages.create
        .mockResolvedValueOnce({ message_id: "msg_1", run })
        .mockResolvedValueOnce({
          message_id: "msg_2",
          run: { ...run, lease_id: "lease_2" },
        });
      const persistence = new CloudMessagePersistence(cloud);
      await persistence.append("t1", "a", null, "aui/v0", running, "running");
      await persistence.append("t1", "b", null, "aui/v0", running, "running");
      await persistence.update("t1", "b", "aui/v0", done, "done");
      runs.end.mockClear();

      hide();
      expect(runs.end).toHaveBeenCalledTimes(1);
      expect(runs.end).toHaveBeenCalledWith(
        "t1",
        "lease_1",
        { reason: "interrupted" },
        { keepalive: true },
      );
      expect(persistence.hasOpenRun("a")).toBe(false);

      messages.update.mockClear();
      await persistence.update("t1", "a", "aui/v0", done, "done");
      expect(messages.update).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(runs.heartbeat).not.toHaveBeenCalled();

      hide();
      expect(runs.end).toHaveBeenCalledTimes(1);
    });

    it("sends nothing once every run ended", async () => {
      const { cloud, runs } = createCloud();
      const persistence = new CloudMessagePersistence(cloud);
      await persistence.append("t1", "a", null, "aui/v0", running, "running");
      await persistence.update("t1", "a", "aui/v0", done, "done");
      runs.end.mockClear();

      hide();
      expect(runs.end).not.toHaveBeenCalled();
    });

    it("leaves runs open when they continue on the server", async () => {
      const { cloud, runs } = createCloud();
      const persistence = new CloudMessagePersistence(cloud, {
        runsContinueOnServer: true,
      });
      await persistence.append("t1", "a", null, "aui/v0", running, "running");

      hide();
      expect(runs.end).not.toHaveBeenCalled();
      expect(persistence.hasOpenRun("a")).toBe(true);
    });

    it("reads a function option when the page hides", async () => {
      const { cloud, runs } = createCloud();
      let continues = true;
      const persistence = new CloudMessagePersistence(cloud, {
        runsContinueOnServer: () => continues,
      });
      await persistence.append("t1", "a", null, "aui/v0", running, "running");

      hide();
      expect(runs.end).not.toHaveBeenCalled();
      continues = false;
      hide();
      expect(runs.end).toHaveBeenCalledWith(
        "t1",
        "lease_1",
        { reason: "interrupted" },
        { keepalive: true },
      );
    });

    it("keeps runs open when the page goes into the back/forward cache", async () => {
      const { cloud, runs } = createCloud();
      const persistence = new CloudMessagePersistence(cloud);
      await persistence.append("t1", "a", null, "aui/v0", running, "running");

      hide(true);
      expect(runs.end).not.toHaveBeenCalled();
      expect(persistence.hasOpenRun("a")).toBe(true);
    });

    it("heartbeats at once when the page comes back from the back/forward cache", async () => {
      const { cloud, runs } = createCloud();
      const persistence = new CloudMessagePersistence(cloud);
      await persistence.append("t1", "a", null, "aui/v0", running, "running");
      hide(true);

      show(false);
      expect(runs.heartbeat).not.toHaveBeenCalled();
      show(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(runs.heartbeat).toHaveBeenCalledTimes(1);
      expect(persistence.hasOpenRun("a")).toBe(true);
      await vi.advanceTimersByTimeAsync(20_000);
      expect(runs.heartbeat).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["run_stale", new CloudAPIError("stale", 409, "run_stale")],
      [
        "superseded",
        new CloudAPIError("superseded", 409, "superseded", {
          superseded_by: "msg_2",
        }),
      ],
    ])(
      "loses a run whose lease answers %s after the page comes back",
      async (_name, error) => {
        const { cloud, messages, runs } = createCloud();
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const persistence = new CloudMessagePersistence(cloud);
        await persistence.append("t1", "a", null, "aui/v0", running, "running");
        hide(true);
        runs.heartbeat.mockRejectedValueOnce(error);

        show(true);
        await vi.advanceTimersByTimeAsync(0);
        expect(persistence.hasOpenRun("a")).toBe(false);
        await persistence.update("t1", "a", "aui/v0", done, "done");
        expect(messages.update).not.toHaveBeenCalled();
        expect(runs.end).not.toHaveBeenCalled();
      },
    );

    it("stops listening on reset", async () => {
      const { cloud, runs } = createCloud();
      const persistence = new CloudMessagePersistence(cloud);
      await persistence.append("t1", "a", null, "aui/v0", running, "running");
      persistence.reset();

      hide();
      expect(runs.end).not.toHaveBeenCalled();
    });
  });

  it("drops a plain write the server refuses because another session runs the message", async () => {
    const { cloud, messages } = createCloud();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    messages.update.mockRejectedValueOnce(
      new CloudAPIError("busy", 409, "run_in_progress"),
    );
    const persistence = new CloudMessagePersistence(cloud);
    persistence.record("local-a", "msg_9");

    await expect(
      persistence.update("t1", "local-a", "aui/v0", done),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);

    messages.update.mockRejectedValueOnce(new CloudAPIError("down", 503));
    await expect(
      persistence.update("t1", "local-a", "aui/v0", done),
    ).rejects.toThrow("down");
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
