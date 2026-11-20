import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "./AssistantCloud";
import { CloudMessagePersistence } from "./CloudMessagePersistence";

describe("CloudMessagePersistence external IDs", () => {
  it("creates with the external ID while mapping the local ID", async () => {
    const create = vi.fn().mockResolvedValue({ message_id: "remote-answer" });
    const cloud = {
      threads: { messages: { create } },
    } as unknown as AssistantCloud;
    const persistence = new CloudMessagePersistence(cloud);

    await persistence.append(
      "thread",
      "local-answer",
      null,
      "aui/v0",
      { text: "answer" },
      undefined,
      "wire-answer",
    );

    expect(create).toHaveBeenCalledExactlyOnceWith("thread", {
      parent_id: null,
      external_id: "wire-answer",
      format: "aui/v0",
      content: { text: "answer" },
    });
    expect(await persistence.getRemoteId("local-answer")).toBe("remote-answer");
    expect(persistence.getResolvedRemoteId("wire-answer")).toBeUndefined();
  });

  it.each(["pending write", "parent resolution"] as const)(
    "preserves the external ID when a failed create retries through %s",
    async (retryPath) => {
      let rejectCreate!: (error: Error) => void;
      const create = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((_, reject) => {
              rejectCreate = reject;
            }),
        )
        .mockResolvedValueOnce({ message_id: "remote-parent" })
        .mockResolvedValueOnce({ message_id: "remote-child" });
      const cloud = {
        threads: { messages: { create } },
      } as unknown as AssistantCloud;
      const persistence = new CloudMessagePersistence(cloud);
      const first = persistence.append(
        "thread",
        "local-parent",
        null,
        "aui/v0",
        {},
        undefined,
        "wire-parent",
      );
      const rejected = expect(first).rejects.toThrow("response lost");
      const pending =
        retryPath === "pending write"
          ? persistence.append(
              "thread",
              "local-parent",
              null,
              "aui/v0",
              { text: "answer" },
              undefined,
              "wire-parent",
            )
          : undefined;

      rejectCreate(new Error("response lost"));
      await rejected;
      if (pending) await pending;
      else
        await persistence.append(
          "thread",
          "local-child",
          "local-parent",
          "aui/v0",
          {},
        );

      expect(create.mock.calls.map(([, body]) => body.external_id)).toEqual(
        retryPath === "pending write"
          ? ["wire-parent", "wire-parent"]
          : ["wire-parent", "wire-parent", "local-child"],
      );
      expect(await persistence.getRemoteId("local-parent")).toBe(
        "remote-parent",
      );
      expect(create.mock.lastCall?.[1].parent_id).toBe(
        retryPath === "pending write" ? null : "remote-parent",
      );
    },
  );

  it.each(["", "w".repeat(256)])(
    "omits an external ID outside the API length limits (%j)",
    async (externalId) => {
      const create = vi.fn().mockResolvedValue({ message_id: "remote-answer" });
      const cloud = {
        threads: { messages: { create } },
      } as unknown as AssistantCloud;
      const persistence = new CloudMessagePersistence(cloud);

      await persistence.append(
        "thread",
        "local-answer",
        null,
        "aui/v0",
        {},
        undefined,
        externalId,
      );

      expect(create.mock.calls[0]?.[1]).not.toHaveProperty("external_id");
      expect(await persistence.getRemoteId("local-answer")).toBe(
        "remote-answer",
      );
    },
  );
});
