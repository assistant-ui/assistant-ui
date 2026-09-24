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

  it("exports the persisted ancestor when nothing persisted lies below it", () => {
    const repository = new MessageRepository();
    repository.addOrUpdateMessage(null, assistantMessage("u"));
    repository.addOrUpdateMessage("u", assistantMessage("placeholder", true));
    expect(repository.headId).toBe("placeholder");

    expect(repository.export().headId).toBe("u");
  });
});
