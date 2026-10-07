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

  it("replaces a head that names no stored message with the most recently listed leaf", () => {
    const stored: ExportedMessageRepository = {
      headId: "never-stored",
      messages: [
        { message: message("root"), parentId: null },
        { message: message("leaf"), parentId: "root" },
      ],
    };

    const { repository, droppedIds } = withoutOrphanedMessages(stored);

    expect(droppedIds).toEqual([]);
    expect(repository).toEqual({ ...stored, headId: "leaf" });
    expect(() => new MessageRepository().import(stored)).toThrow();
    const imported = new MessageRepository();
    imported.import(repository);
    expect(imported.headId).toBe("leaf");
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

const assistantMessage = (id: string, isOptimistic = false): ThreadMessage => ({
  id,
  createdAt: new Date(0),
  role: "assistant",
  content: [{ type: "text", text: id }],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
    ...(isOptimistic ? { isOptimistic: true } : {}),
  },
});

const roundTrip = (repository: MessageRepository) => {
  const restored = new MessageRepository();
  restored.import(repository.export());
  return restored;
};

describe("MessageRepository export with an optimistic head", () => {
  it("keeps the persisted ancestor of a selected running branch over a later sibling", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", {
      ...assistantMessage("placeholder", true),
      status: { type: "running" },
    });
    repository.addOrUpdateMessage("u", assistantMessage("later"));
    expect(repository.headId).toBe("placeholder");

    expect(repository.export().headId).toBe("u");
    expect(
      roundTrip(repository)
        .getMessages()
        .map((m) => m.id),
    ).toEqual(["u"]);
  });

  it("keeps the saved answer before a selected optimistic branch over a later sibling", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", assistantMessage("answer"));
    repository.addOrUpdateMessage("u", {
      ...assistantMessage("placeholder", true),
      status: { type: "running" },
    });
    repository.switchToBranch("placeholder");
    repository.addOrUpdateMessage("u", assistantMessage("later"));
    expect(repository.headId).toBe("placeholder");

    expect(repository.export().headId).toBe("answer");
    const restored = roundTrip(repository);
    expect(restored.getMessages().map((m) => m.id)).toEqual(["u", "answer"]);
  });

  it("keeps a persisted sibling of the optimistic head through export and import", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", assistantMessage("placeholder", true));
    repository.addOrUpdateMessage("u", assistantMessage("a"));
    expect(repository.headId).toBe("placeholder");

    expect(repository.export().headId).toBe("a");

    const restored = roundTrip(repository);
    expect(restored.getMessages().map((m) => m.id)).toEqual(["u", "a"]);
    expect(restored.getBranches("a")).toEqual(["a"]);
  });

  it("exports a persisted root sibling as the head when the optimistic head is a root message", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("a"));
    repository.addOrUpdateMessage(null, assistantMessage("placeholder", true));
    repository.switchToBranch("placeholder");

    expect(repository.export().headId).toBe("a");
    expect(
      roundTrip(repository)
        .getMessages()
        .map((m) => m.id),
    ).toEqual(["a"]);
  });

  it("follows a persisted branch below the optimistic head's ancestor to its leaf", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", assistantMessage("a1"));
    repository.addOrUpdateMessage("a1", assistantMessage("u2"));
    repository.addOrUpdateMessage("u", assistantMessage("placeholder", true));
    repository.switchToBranch("placeholder");

    expect(repository.export().headId).toBe("u2");
    expect(
      roundTrip(repository)
        .getMessages()
        .map((m) => m.id),
    ).toEqual(["u", "a1", "u2"]);
  });

  it("follows a persisted message's selected child, not its last child", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", assistantMessage("a1"));
    repository.addOrUpdateMessage("a1", assistantMessage("b1"));
    repository.addOrUpdateMessage("a1", assistantMessage("b2"));
    repository.switchToBranch("b1");
    repository.addOrUpdateMessage("u", assistantMessage("placeholder", true));
    repository.switchToBranch("placeholder");

    expect(repository.export().headId).toBe("b1");
    const restored = roundTrip(repository);
    expect(restored.getMessages().map((m) => m.id)).toEqual(["u", "a1", "b1"]);
    expect(restored.getBranches("b1")).toEqual(["b1", "b2"]);
  });

  it("follows the selected optimistic chain to its persisted descendant before a later sibling", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", assistantMessage("o1", true));
    repository.addOrUpdateMessage("o1", assistantMessage("d"));
    repository.addOrUpdateMessage("o1", assistantMessage("o2", true));
    repository.switchToBranch("o2");
    repository.addOrUpdateMessage("u", assistantMessage("s"));
    expect(repository.headId).toBe("o2");

    expect(repository.export().headId).toBe("d");
    const restored = roundTrip(repository);
    expect(restored.getMessages().map((m) => m.id)).toEqual(["u", "d"]);
    expect(restored.getBranches("d")).toEqual(["d", "s"]);
  });

  it("follows the selected persisted child below an optimistic message, not its last child", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("a"));
    repository.addOrUpdateMessage("a", assistantMessage("o", true));
    repository.addOrUpdateMessage("o", assistantMessage("b"));
    repository.addOrUpdateMessage("o", assistantMessage("c"));
    repository.addOrUpdateMessage("b", assistantMessage("p", true));
    repository.addOrUpdateMessage(null, assistantMessage("p", true));
    expect(repository.headId).toBe("p");

    expect(repository.export().headId).toBe("b");
    const restored = roundTrip(repository);
    expect(restored.getMessages().map((m) => m.id)).toEqual(["a", "b"]);
    expect(restored.getBranches("b")).toEqual(["b", "c"]);
  });

  it("exports the persisted ancestor when nothing persisted lies below it", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", assistantMessage("placeholder", true));
    expect(repository.headId).toBe("placeholder");

    expect(repository.export().headId).toBe("u");
  });
});
