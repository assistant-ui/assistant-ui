import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "./AssistantCloud";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreadMessages } from "./AssistantCloudThreadMessages";
import { CloudMessagePersistence } from "./CloudMessagePersistence";

describe("backend transcript cloud client", () => {
  it("sends external ids only when supplied", async () => {
    const makeRequest = vi.fn().mockResolvedValue({ message_id: "cloud-1" });
    const messages = new AssistantCloudThreadMessages({
      makeRequest,
    } as unknown as AssistantCloudAPI);
    const body = { parent_id: null, format: "aui/v0", content: {} };

    await messages.create("thread-1", body);
    expect(makeRequest).toHaveBeenLastCalledWith("/threads/thread-1/messages", {
      method: "POST",
      body,
    });

    await messages.create("thread-1", {
      ...body,
      external_id: "backend-1",
      parent_external_id: "backend-0",
    });
    expect(makeRequest).toHaveBeenLastCalledWith("/threads/thread-1/messages", {
      method: "POST",
      body: {
        ...body,
        external_id: "backend-1",
        parent_external_id: "backend-0",
      },
    });
  });

  it("decodes external ids and treats an absent field as null", async () => {
    const makeRequest = vi.fn().mockResolvedValue({
      messages: [
        {
          id: "cloud-1",
          parent_id: null,
          height: 0,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          format: "aui/v0",
          content: {},
          external_id: "backend-1",
        },
        {
          id: "cloud-2",
          parent_id: "cloud-1",
          height: 1,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          format: "aui/v0",
          content: {},
        },
      ],
    });
    const messages = new AssistantCloudThreadMessages({
      makeRequest,
    } as unknown as AssistantCloudAPI);

    const result = await messages.list("thread-1");
    expect(result.messages.map((message) => message.external_id)).toEqual([
      "backend-1",
      null,
    ]);
  });

  it("records a resolved local to cloud message mapping", async () => {
    const persistence = new CloudMessagePersistence({} as AssistantCloud);
    persistence.record("backend-1", "cloud-1");

    expect(persistence.isPersisted("backend-1")).toBe(true);
    expect(await persistence.getRemoteId("backend-1")).toBe("cloud-1");
    expect(persistence.getResolvedRemoteId("backend-1")).toBe("cloud-1");
  });
});
