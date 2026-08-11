import { beforeEach, describe, expect, it, vi } from "vitest";
import { CloudMessagePersistence } from "../CloudMessagePersistence";
import type { AssistantCloud } from "../AssistantCloud";

function createMockCloud() {
  return {
    threads: {
      messages: {
        create: vi.fn(),
        list: vi.fn(),
        update: vi.fn(),
      },
    },
  } as unknown as AssistantCloud;
}

describe("CloudMessagePersistence", () => {
  let cloud: AssistantCloud;
  let persistence: CloudMessagePersistence;

  beforeEach(() => {
    vi.restoreAllMocks();
    cloud = createMockCloud();
    persistence = new CloudMessagePersistence(cloud);
  });

  it("appends a message and maps local ID to remote ID", async () => {
    vi.mocked(cloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-1",
    });

    await persistence.append("thread-1", "local-1", null, "aui/v0", {
      text: "hello",
    });

    expect(persistence.isPersisted("local-1")).toBe(true);
    expect(await persistence.getRemoteId("local-1")).toBe("remote-1");
  });

  it("uses the current client without losing ID mappings", async () => {
    const firstCloud = createMockCloud();
    const secondCloud = createMockCloud();
    let currentCloud = firstCloud;
    persistence = new CloudMessagePersistence(() => currentCloud);
    vi.mocked(firstCloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-parent",
    });
    vi.mocked(secondCloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-child",
    });

    await persistence.append("thread-1", "parent", null, "aui/v0", {
      text: "parent",
    });
    currentCloud = secondCloud;
    await persistence.append("thread-1", "child", "parent", "aui/v0", {
      text: "child",
    });

    expect(secondCloud.threads.messages.create).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ parent_id: "remote-parent" }),
    );
    expect(await persistence.getRemoteId("child")).toBe("remote-child");
  });

  it("resolves parent ID from a concurrent append", async () => {
    // Parent creation is delayed — the promise won't resolve immediately
    let resolveParent!: (v: { message_id: string }) => void;
    vi.mocked(cloud.threads.messages.create).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveParent = resolve;
        }),
    );
    vi.mocked(cloud.threads.messages.create).mockResolvedValueOnce({
      message_id: "remote-child",
    });

    // Start parent append (doesn't resolve yet)
    const parentPromise = persistence.append(
      "thread-1",
      "parent",
      null,
      "aui/v0",
      { text: "parent" },
    );

    // Start child append — it will await the parent's promise for its remote ID
    const childPromise = persistence.append(
      "thread-1",
      "child",
      "parent",
      "aui/v0",
      { text: "child" },
    );

    // Now resolve the parent
    resolveParent({ message_id: "remote-parent" });
    await parentPromise;
    await childPromise;

    // The child's create call should have used the parent's resolved remote ID
    const childCreateCall = vi.mocked(cloud.threads.messages.create).mock
      .calls[1]!;
    expect(childCreateCall[1]).toMatchObject({
      parent_id: "remote-parent",
    });
  });

  it("deduplicates concurrent child appends while the parent is pending", async () => {
    let resolveParent!: (value: { message_id: string }) => void;
    vi.mocked(cloud.threads.messages.create)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveParent = resolve;
          }),
      )
      .mockResolvedValue({ message_id: "remote-child" });

    const parent = persistence.append("thread-1", "parent", null, "aui/v0", {
      text: "parent",
    });
    const firstChild = persistence.append(
      "thread-1",
      "child",
      "parent",
      "aui/v0",
      { text: "child" },
    );
    const secondChild = persistence.append(
      "thread-1",
      "child",
      "parent",
      "aui/v0",
      { text: "child" },
    );

    resolveParent({ message_id: "remote-parent" });
    await Promise.all([parent, firstChild, secondChild]);

    expect(cloud.threads.messages.create).toHaveBeenCalledTimes(2);
  });

  it("loaded messages are marked as persisted and not re-created", async () => {
    vi.mocked(cloud.threads.messages.list).mockResolvedValue({
      messages: [
        {
          id: "msg-1",
          parent_id: null,
          height: 0,
          created_at: "2025-01-01T00:00:00Z" as unknown as Date,
          updated_at: "2025-01-01T00:00:00Z" as unknown as Date,
          format: "aui/v0",
          content: { text: "loaded" },
        },
      ],
    });

    await persistence.load("thread-1");

    expect(persistence.isPersisted("msg-1")).toBe(true);
  });

  it("updates an already-persisted message", async () => {
    vi.mocked(cloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-1",
    });
    vi.mocked(cloud.threads.messages.update).mockResolvedValue(undefined);

    await persistence.append("thread-1", "local-1", null, "aui/v0", {
      text: "original",
    });
    await persistence.update("thread-1", "local-1", "aui/v0", {
      text: "updated",
    });

    expect(cloud.threads.messages.update).toHaveBeenCalledWith(
      "thread-1",
      "remote-1",
      { content: { text: "updated" } },
    );
  });

  it("keeps mappings for duplicate local message IDs scoped to their thread", async () => {
    vi.mocked(cloud.threads.messages.create)
      .mockResolvedValueOnce({ message_id: "remote-a-parent" })
      .mockResolvedValueOnce({ message_id: "remote-b-parent" })
      .mockResolvedValueOnce({ message_id: "remote-a-child" })
      .mockResolvedValueOnce({ message_id: "remote-b-child" });
    vi.mocked(cloud.threads.messages.update).mockResolvedValue(undefined);

    await persistence.append("thread-a", "local-1", null, "aui/v0", {
      text: "thread a",
    });
    await persistence.append("thread-b", "local-1", null, "aui/v0", {
      text: "thread b",
    });
    await persistence.append("thread-a", "child", "local-1", "aui/v0", {
      text: "thread a child",
    });
    await persistence.append("thread-b", "child", "local-1", "aui/v0", {
      text: "thread b child",
    });

    expect(persistence.isPersisted("thread-a", "local-1")).toBe(true);
    expect(persistence.isPersisted("thread-b", "local-1")).toBe(true);
    expect(await persistence.getRemoteId("thread-a", "local-1")).toBe(
      "remote-a-parent",
    );
    expect(await persistence.getRemoteId("thread-b", "local-1")).toBe(
      "remote-b-parent",
    );
    expect(cloud.threads.messages.create).toHaveBeenNthCalledWith(
      3,
      "thread-a",
      expect.objectContaining({ parent_id: "remote-a-parent" }),
    );
    expect(cloud.threads.messages.create).toHaveBeenNthCalledWith(
      4,
      "thread-b",
      expect.objectContaining({ parent_id: "remote-b-parent" }),
    );

    await persistence.update("thread-a", "local-1", "aui/v0", {
      text: "updated",
    });

    expect(cloud.threads.messages.update).toHaveBeenCalledWith(
      "thread-a",
      "remote-a-parent",
      { content: { text: "updated" } },
    );
  });

  it("does not let a failed pre-reset append clear replacement mappings", async () => {
    let rejectOldAppend!: (error: Error) => void;
    vi.mocked(cloud.threads.messages.create)
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectOldAppend = reject;
          }),
      )
      .mockResolvedValueOnce({ message_id: "remote-new" });

    const oldAppend = persistence.append(
      "thread-1",
      "old-message",
      null,
      "aui/v0",
      { text: "old" },
    );
    persistence.reset("thread-1");
    await persistence.append("thread-1", "new-message", null, "aui/v0", {
      text: "new",
    });

    rejectOldAppend(new Error("old append failed"));
    await expect(oldAppend).rejects.toThrow("old append failed");

    expect(persistence.isPersisted("thread-1", "new-message")).toBe(true);
    expect(await persistence.getRemoteId("thread-1", "new-message")).toBe(
      "remote-new",
    );
  });

  it("warns and skips update when no remote id is mapped", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await persistence.update("thread-1", "unmapped-1", "aui/v0", {
      text: "x",
    });

    expect(cloud.threads.messages.update).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "Skipping update for message unmapped-1: no remote id is mapped.",
    );
  });

  it("cleans up ID mapping on append failure", async () => {
    vi.mocked(cloud.threads.messages.create).mockRejectedValue(
      new Error("network error"),
    );

    await expect(
      persistence.append("thread-1", "local-1", null, "aui/v0", {
        text: "fail",
      }),
    ).rejects.toThrow("network error");

    expect(persistence.isPersisted("local-1")).toBe(false);
  });

  it("reset clears all ID mappings", async () => {
    vi.mocked(cloud.threads.messages.create).mockResolvedValue({
      message_id: "remote-1",
    });

    await persistence.append("thread-1", "local-1", null, "aui/v0", {
      text: "hello",
    });
    expect(persistence.isPersisted("local-1")).toBe(true);

    persistence.reset();

    expect(persistence.isPersisted("local-1")).toBe(false);
  });
});
