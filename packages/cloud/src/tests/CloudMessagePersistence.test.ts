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
