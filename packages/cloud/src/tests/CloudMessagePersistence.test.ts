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

function createCloudMessages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `message-${index + 1}`,
    parent_id: null,
    height: index,
    created_at: "2025-01-01T00:00:00Z" as unknown as Date,
    updated_at: "2025-01-01T00:00:00Z" as unknown as Date,
    format: "aui/v0",
    content: {},
  }));
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

  it.each(["__proto__", "constructor", "toString"])(
    "supports prototype-named local ID %s",
    async (messageId) => {
      vi.mocked(cloud.threads.messages.create).mockResolvedValue({
        message_id: `remote-${messageId}`,
      });

      expect(persistence.isPersisted(messageId)).toBe(false);

      await persistence.append("thread-1", messageId, null, "aui/v0", {
        text: "hello",
      });

      expect(persistence.isPersisted(messageId)).toBe(true);
      expect(await persistence.getRemoteId(messageId)).toBe(
        `remote-${messageId}`,
      );
    },
  );

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

    expect(persistence.isPersisted("child")).toBe(true);
    resolveParent({ message_id: "remote-parent" });
    await Promise.all([parent, firstChild, secondChild]);

    expect(cloud.threads.messages.create).toHaveBeenCalledTimes(2);
  });

  it("resolves remote IDs throughout a concurrent message chain", async () => {
    let resolveParent!: (value: { message_id: string }) => void;
    vi.mocked(cloud.threads.messages.create)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveParent = resolve;
          }),
      )
      .mockResolvedValueOnce({ message_id: "remote-child" })
      .mockResolvedValueOnce({ message_id: "remote-grandchild" });

    const parent = persistence.append("thread-1", "parent", null, "aui/v0", {
      text: "parent",
    });
    const child = persistence.append("thread-1", "child", "parent", "aui/v0", {
      text: "child",
    });
    const grandchild = persistence.append(
      "thread-1",
      "grandchild",
      "child",
      "aui/v0",
      { text: "grandchild" },
    );

    resolveParent({ message_id: "remote-parent" });
    await Promise.all([parent, child, grandchild]);

    expect(cloud.threads.messages.create).toHaveBeenCalledWith("thread-1", {
      parent_id: "remote-parent",
      format: "aui/v0",
      content: { text: "child" },
    });
    expect(cloud.threads.messages.create).toHaveBeenCalledWith("thread-1", {
      parent_id: "remote-child",
      format: "aui/v0",
      content: { text: "grandchild" },
    });
  });

  it("re-appends a message after its mapping has settled", async () => {
    vi.mocked(cloud.threads.messages.create)
      .mockResolvedValueOnce({ message_id: "remote-1" })
      .mockResolvedValueOnce({ message_id: "remote-2" });

    await persistence.append("thread-1", "local-1", null, "aui/v0", {
      text: "first",
    });
    await persistence.append("thread-1", "local-1", null, "aui/v0", {
      text: "second",
    });

    expect(cloud.threads.messages.create).toHaveBeenCalledTimes(2);
    expect(await persistence.getRemoteId("local-1")).toBe("remote-2");
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

  it("maps prototype-named loaded messages", async () => {
    vi.mocked(cloud.threads.messages.list).mockResolvedValue({
      messages: [
        {
          id: "__proto__",
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

    expect(persistence.isPersisted("__proto__")).toBe(true);
    expect(await persistence.getRemoteId("__proto__")).toBe("__proto__");
  });

  it("follows the message cursor across pages in server order", async () => {
    const rows = createCloudMessages(450);
    vi.mocked(cloud.threads.messages.list).mockImplementation(
      async (_threadId, query) => {
        const start = query?.after
          ? rows.findIndex((row) => row.id === query.after) + 1
          : 0;
        return { messages: rows.slice(start, start + 200) };
      },
    );

    const messages = await persistence.load("thread-1", "aui/v0");

    expect(messages.map((message) => message.id)).toEqual(
      rows.map((row) => row.id),
    );
    expect(cloud.threads.messages.list).toHaveBeenCalledTimes(3);
    expect(cloud.threads.messages.list).toHaveBeenNthCalledWith(1, "thread-1", {
      format: "aui/v0",
      limit: 200,
    });
    expect(cloud.threads.messages.list).toHaveBeenNthCalledWith(3, "thread-1", {
      format: "aui/v0",
      limit: 200,
      after: "message-400",
    });
  });

  it("stops without duplicates when a later cursor stops resolving", async () => {
    const rows = createCloudMessages(450);
    vi.mocked(cloud.threads.messages.list).mockImplementation(
      async (_threadId, query) => {
        // The third request replays page one, the way the endpoint answers a
        // cursor whose message no longer resolves.
        const start =
          query?.after && query.after !== "message-400"
            ? rows.findIndex((row) => row.id === query.after) + 1
            : 0;
        return { messages: rows.slice(start, start + 200) };
      },
    );

    const messages = await persistence.load("thread-1", "aui/v0");

    expect(messages.map((message) => message.id)).toEqual(
      rows.slice(0, 400).map((row) => row.id),
    );
    expect(cloud.threads.messages.list).toHaveBeenCalledTimes(3);
  });

  it("stops when a page does not advance the cursor", async () => {
    vi.mocked(cloud.threads.messages.list).mockResolvedValue({
      messages: createCloudMessages(200),
    });

    const messages = await persistence.load("thread-1", "aui/v0");

    expect(messages).toHaveLength(200);
    expect(cloud.threads.messages.list).toHaveBeenCalledTimes(2);
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
