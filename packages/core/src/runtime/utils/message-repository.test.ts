import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "../../types/message";
import {
  ExportedMessageRepository,
  MessageRepository,
  withoutOrphanedMessages,
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

describe("withoutOrphanedMessages", () => {
  it("keeps a child listed before its parent", () => {
    const stored: ExportedMessageRepository = {
      headId: "child",
      messages: [
        { message: message("child"), parentId: "parent" },
        { message: message("parent"), parentId: null },
      ],
    };

    const { repository, droppedIds } = withoutOrphanedMessages(stored);

    expect(repository).toEqual(stored);
    expect(droppedIds).toEqual([]);
    const imported = new MessageRepository();
    imported.import(repository);
    expect(imported.getMessages().map((m) => m.id)).toEqual([
      "parent",
      "child",
    ]);
  });

  it("drops a missing parent's child and descendants while keeping an independent branch", () => {
    const stored: ExportedMessageRepository = {
      headId: "kept-child",
      messages: [
        { message: message("grandchild"), parentId: "child" },
        { message: message("kept-root"), parentId: null },
        { message: message("child"), parentId: "missing" },
        { message: message("descendant"), parentId: "grandchild" },
        { message: message("kept-child"), parentId: "kept-root" },
      ],
    };

    const { repository, droppedIds } = withoutOrphanedMessages(stored);

    expect(droppedIds).toEqual(["grandchild", "child", "descendant"]);
    expect(repository).toEqual({
      headId: "kept-child",
      messages: [stored.messages[1], stored.messages[4]],
    });
    expect(() => new MessageRepository().import(stored)).toThrow(
      /Parent message not found/,
    );
    const imported = new MessageRepository();
    imported.import(repository);
    expect(imported.getMessages().map((m) => m.id)).toEqual([
      "kept-root",
      "kept-child",
    ]);
  });

  it("replaces a dropped head with the most recently listed kept leaf", () => {
    const stored: ExportedMessageRepository = {
      headId: "orphan",
      messages: [
        { message: message("older-leaf"), parentId: "root" },
        { message: message("latest-leaf"), parentId: "root" },
        { message: message("root"), parentId: null },
        { message: message("orphan"), parentId: "missing" },
      ],
    };

    const { repository, droppedIds } = withoutOrphanedMessages(stored);

    expect(droppedIds).toEqual(["orphan"]);
    expect(repository.headId).toBe("latest-leaf");
    expect(repository.messages).toEqual(stored.messages.slice(0, 3));
    const imported = new MessageRepository();
    imported.import(repository);
    expect(imported.headId).toBe("latest-leaf");
    expect(imported.getMessages().map((m) => m.id)).toEqual([
      "root",
      "latest-leaf",
    ]);
    expect(imported.getMessage("older-leaf").parentId).toBe("root");
    expect(imported.export().messages).toHaveLength(3);
  });
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

  it("moves no child when the replacement is a descendant of the deleted message", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, message("a"));
    repository.addOrUpdateMessage("a", message("b"));
    repository.addOrUpdateMessage("a", message("c"));
    repository.addOrUpdateMessage("c", message("d"));
    const before = snapshot(repository);

    expect(() => repository.deleteMessage("a", "c")).toThrow(
      /Replacement is the deleted message or one of its descendants/,
    );
    expect(snapshot(repository)).toEqual(before);

    expect(() => repository.deleteMessage("a", "d")).toThrow(
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

describe("MessageRepository import order", () => {
  it("imports a message listed before its parent", () => {
    const repository = new MessageRepository();
    repository.import({
      messages: [
        { message: message("child"), parentId: "parent" },
        { message: message("parent"), parentId: null },
      ],
    });

    expect(repository.headId).toBe("child");
    expect(repository.getMessages().map((m) => m.id)).toEqual([
      "parent",
      "child",
    ]);
  });

  it("keeps the listed order for a message whose parent the repository holds", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, message("p"));
    const newer = message("c", "newer");

    repository.import({
      headId: "c",
      messages: [
        { message: message("c"), parentId: "p" },
        { message: newer, parentId: null },
        { message: message("p"), parentId: null },
      ],
    });

    expect(repository.getMessages()).toEqual([newer]);
  });

  it("heads a history stored out of order at its latest message", () => {
    const repository = new MessageRepository();
    repository.import({
      messages: [
        { message: message("question"), parentId: null },
        { message: message("follow-up"), parentId: "paused" },
        { message: message("answer"), parentId: "follow-up" },
        { message: message("paused"), parentId: "question" },
      ],
    });

    expect(repository.headId).toBe("answer");
    expect(repository.getMessages().map((m) => m.id)).toEqual([
      "question",
      "paused",
      "follow-up",
      "answer",
    ]);
  });
});
