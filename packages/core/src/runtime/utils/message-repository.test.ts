import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "../../types/message";
import { ExportedMessageRepository } from "./message-repository";

const nestedRunningAssistant: ThreadMessage = {
  id: "nested-assistant",
  createdAt: new Date(0),
  role: "assistant",
  content: [],
  status: { type: "running" },
  metadata: {
    unstable_state: {},
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
};

const delegating = {
  id: "assistant-1",
  role: "assistant" as const,
  content: [
    {
      type: "tool-call" as const,
      toolCallId: "delegate-1",
      toolName: "delegate",
      args: {},
      argsText: "",
      messages: [nestedRunningAssistant],
    },
  ],
};

describe("ExportedMessageRepository", () => {
  it("imports a message saved mid-delegation as pending, not running", () => {
    const fromArray = ExportedMessageRepository.fromArray([delegating]);
    const fromBranchable = ExportedMessageRepository.fromBranchableArray([
      { message: delegating, parentId: null },
    ]);

    for (const repository of [fromArray, fromBranchable]) {
      expect(repository.messages[0]?.message.status).toMatchObject({
        type: "requires-action",
        reason: "tool-calls",
      });
    }
  });
});
