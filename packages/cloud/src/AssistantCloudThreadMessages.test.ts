import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreadMessages } from "./AssistantCloudThreadMessages";

const createCloudThreadMessages = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return {
    messages: new AssistantCloudThreadMessages(api),
    makeRequest,
  };
};

describe("AssistantCloudThreadMessages responses", () => {
  it("decodes canonical message responses without changing content", async () => {
    const { messages, makeRequest } = createCloudThreadMessages();
    makeRequest.mockResolvedValue({
      messages: [
        {
          id: "message-1",
          parent_id: null,
          height: 0,
          created_at: "2026-07-16T13:00:00.000Z",
          updated_at: "2026-07-16T13:05:00.987Z",
          format: "aui/v0",
          content: { created_at: "leave-this-string-untouched" },
        },
      ],
    });

    const result = await messages.list("thread-1");
    const message = result.messages[0]!;

    expect(message.created_at).toBeInstanceOf(Date);
    expect(message.updated_at).toBeInstanceOf(Date);
    expect(message.updated_at.toISOString()).toBe("2026-07-16T13:05:00.987Z");
    expect(message.content).toEqual({
      created_at: "leave-this-string-untouched",
    });
  });
});
