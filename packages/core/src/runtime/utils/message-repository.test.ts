import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "../../types/message";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "./message-repository";

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

const message = (id: string, text = id): ThreadMessage => ({
  id,
  createdAt: new Date(0),
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
});

const snapshot = (repository: MessageRepository) => ({
  headId: repository.headId,
  visible: repository.getMessages(),
  exported: repository.export(),
});

describe("MessageRepository rejected operations", () => {
  it("keeps the old content when an update is rejected as a cycle", () => {
    const repository = new MessageRepository();
    const original = message("a");
    repository.addOrUpdateMessage(null, original);
    const before = snapshot(repository);

    expect(() =>
      repository.addOrUpdateMessage("a", message("a", "edited")),
    ).toThrow(/same id already exists in the parent tree/);

    expect(snapshot(repository)).toEqual(before);
    expect(repository.getMessage("a").message).toBe(original);
  });

  it("moves no child when the replacement is a child of the deleted message", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, message("a"));
    repository.addOrUpdateMessage("a", message("b"));
    repository.addOrUpdateMessage("a", message("c"));
    const before = snapshot(repository);

    expect(() => repository.deleteMessage("a", "c")).toThrow(
      /Replacement is the deleted message or one of its descendants/,
    );

    expect(snapshot(repository)).toEqual(before);
    expect(repository.getMessage("b").parentId).toBe("a");
    expect(repository.getBranches("b")).toEqual(["b", "c"]);
  });

  it("rejects a message as its own replacement instead of leaving the head on it", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, message("a"));
    const before = snapshot(repository);

    expect(() => repository.deleteMessage("a", "a")).toThrow(
      /Replacement is the deleted message or one of its descendants/,
    );

    expect(snapshot(repository)).toEqual(before);
    expect(repository.getMessage("a").message.id).toBe("a");
  });
});
