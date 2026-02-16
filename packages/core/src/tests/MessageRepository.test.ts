import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  MessageRepository,
  ExportedMessageRepository,
} from "../runtime/message-repository";
import type { ThreadMessage, TextMessagePart } from "../types";
import type { ThreadMessageLike } from "../runtime/thread-message-like";

// Mock generateId and generateOptimisticId to make tests deterministic
const mockGenerateId = vi.fn();
const mockGenerateOptimisticId = vi.fn();
const mockIsOptimisticId = vi.fn((id: string) =>
  id.startsWith("__optimistic__"),
);

vi.mock("../utils/id", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/id")>();
  return {
    ...original,
    generateId: () => mockGenerateId(),
    generateOptimisticId: () => mockGenerateOptimisticId(),
    isOptimisticId: (id: string) => mockIsOptimisticId(id),
  };
});

/**
 * Tests for the MessageRepository class, which manages message threads with branching capabilities.
 *
 * This suite verifies that the repository:
 * - Correctly manages message additions, updates, and deletions
 * - Properly maintains parent-child relationships between messages
 * - Handles branch creation and switching between branches
 * - Successfully imports and exports repository state
 * - Correctly manages optimistic messages in the thread
 * - Handles edge cases and error conditions gracefully
 */
describe("MessageRepository", () => {
  let repository: MessageRepository;
  let nextMockId = 1;

  /**
   * Creates a test ThreadMessage with the given overrides.
   */
  const createTestMessage = (overrides = {}): ThreadMessage => ({
    id: "test-id",
    role: "assistant",
    createdAt: new Date(),
    content: [{ type: "text", text: "Test message" }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
    ...overrides,
  });

  /**
   * Creates a test CoreMessage with the given overrides.
   */
  const createThreadMessageLike = (overrides = {}): ThreadMessageLike => ({
    role: "assistant",
    content: [{ type: "text", text: "Test message" }],
    ...overrides,
  });

  beforeEach(() => {
    repository = new MessageRepository();
    // Reset mocks with predictable counter-based values
    nextMockId = 1;
    mockGenerateId.mockImplementation(() => `mock-id-${nextMockId++}`);
    mockGenerateOptimisticId.mockImplementation(
      () => `__optimistic__mock-id-${nextMockId++}`,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Core functionality tests - these test the public contract
  describe("Basic CRUD operations", () => {
    it("should add a new message to the repository", () => {
      const message = createTestMessage({ id: "message-id" });
      repository.addOrUpdateMessage(null, message);

      const messages = repository.getMessages();
      expect(messages).toContain(message);
    });

    it("should update an existing message", () => {
      const message = createTestMessage({ id: "message-id" });
      repository.addOrUpdateMessage(null, message);

      const updatedContent = [
        { type: "text", text: "Updated message" },
      ] as const;
      const updatedMessage = createTestMessage({
        id: "message-id",
        content: updatedContent,
      });

      repository.addOrUpdateMessage(null, updatedMessage);

      const retrievedMessage = repository.getMessage("message-id").message;
      expect(retrievedMessage.content).toEqual(updatedContent);
    });

    it("should establish parent-child relationships between messages", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", child);

      const childWithParent = repository.getMessage("child-id");
      expect(childWithParent.parentId).toBe("parent-id");
    });

    it("should throw an error when parent message is not found", () => {
      const message = createTestMessage();

      expect(() => {
        repository.addOrUpdateMessage("non-existent-id", message);
      }).toThrow(/Parent message not found/);
    });

    it("should retrieve all messages in the current branch", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });
      const grandchild = createTestMessage({ id: "grandchild-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", child);
      repository.addOrUpdateMessage("child-id", grandchild);

      const messages = repository.getMessages();

      expect(messages.map((m) => m.id)).toEqual([
        "parent-id",
        "child-id",
        "grandchild-id",
      ]);
    });

    it("should track the head message", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });

      repository.addOrUpdateMessage(null, parent);
      expect(repository.headId).toBe("parent-id");

      repository.addOrUpdateMessage("parent-id", child);
      expect(repository.headId).toBe("child-id");
    });

    it("should delete a message and adjust the head", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", child);

      expect(repository.headId).toBe("child-id");

      repository.deleteMessage("child-id");

      expect(repository.headId).toBe("parent-id");

      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual(["parent-id"]);
    });

    it("should clear all messages", () => {
      const message = createTestMessage();
      repository.addOrUpdateMessage(null, message);

      repository.clear();

      expect(repository.getMessages()).toHaveLength(0);
      expect(repository.headId).toBeNull();
    });
  });

  describe("Branch management", () => {
    it("should create multiple branches from a parent message", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const branch1 = createTestMessage({ id: "branch1-id" });
      const branch2 = createTestMessage({ id: "branch2-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", branch1);
      repository.addOrUpdateMessage("parent-id", branch2);

      repository.switchToBranch("branch1-id");
      expect(repository.headId).toBe("branch1-id");

      repository.switchToBranch("branch2-id");
      expect(repository.headId).toBe("branch2-id");

      const branches = repository.getBranches("branch1-id");
      expect(branches).toContain("branch1-id");
      expect(branches).toContain("branch2-id");
    });

    it("should switch between branches and maintain branch state", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const branch1 = createTestMessage({ id: "branch1-id" });
      const branch2 = createTestMessage({ id: "branch2-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", branch1);
      repository.addOrUpdateMessage("parent-id", branch2);

      repository.switchToBranch("branch1-id");
      expect(repository.headId).toBe("branch1-id");

      const messages1 = repository.getMessages();
      expect(messages1.map((m) => m.id)).toEqual(["parent-id", "branch1-id"]);

      repository.switchToBranch("branch2-id");
      expect(repository.headId).toBe("branch2-id");

      const messages2 = repository.getMessages();
      expect(messages2.map((m) => m.id)).toEqual(["parent-id", "branch2-id"]);
    });

    it("should throw error when switching to a non-existent branch", () => {
      expect(() => {
        repository.switchToBranch("non-existent-id");
      }).toThrow(/Branch not found/);
    });

    it("should reset head to an earlier message in the tree", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });
      const grandchild = createTestMessage({ id: "grandchild-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", child);
      repository.addOrUpdateMessage("child-id", grandchild);

      repository.resetHead("parent-id");

      expect(repository.headId).toBe("parent-id");

      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual(["parent-id"]);
    });

    it("should remove children when resetting head to a message with children", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });
      const grandchild1 = createTestMessage({ id: "grandchild1-id" });
      const grandchild2 = createTestMessage({ id: "grandchild2-id" });
      const greatGrandchild = createTestMessage({ id: "greatgrandchild-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", child);
      repository.addOrUpdateMessage("child-id", grandchild1);
      repository.addOrUpdateMessage("child-id", grandchild2);
      repository.addOrUpdateMessage("grandchild2-id", greatGrandchild);

      repository.resetHead("child-id");

      expect(repository.headId).toBe("child-id");

      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual(["parent-id", "child-id"]);

      expect(() => repository.getMessage("grandchild1-id")).toThrow(
        /Message not found/,
      );
      expect(() => repository.getMessage("grandchild2-id")).toThrow(
        /Message not found/,
      );
      expect(() => repository.getMessage("greatgrandchild-id")).toThrow(
        /Message not found/,
      );

      const branches = repository.getBranches("child-id");
      expect(branches).toEqual(["child-id"]);
    });

    it("should reset head to null when null is passed", () => {
      const message = createTestMessage();
      repository.addOrUpdateMessage(null, message);

      repository.resetHead(null);

      expect(repository.headId).toBeNull();
      expect(repository.getMessages()).toHaveLength(0);
    });
  });

  describe("Optimistic messages", () => {
    it("should create an optimistic message with a unique ID", () => {
      mockGenerateOptimisticId.mockReturnValue("__optimistic__generated-id");

      const coreMessage = createThreadMessageLike();
      const optimisticId = repository.appendOptimisticMessage(
        null,
        coreMessage,
      );

      expect(optimisticId).toBe("__optimistic__generated-id");
      expect(repository.getMessage(optimisticId).message.status?.type).toBe(
        "running",
      );
    });

    it("should create an optimistic message as a child of a specified parent", () => {
      const parent = createTestMessage({ id: "parent-id" });
      repository.addOrUpdateMessage(null, parent);

      const coreMessage = createThreadMessageLike();
      const optimisticId = repository.appendOptimisticMessage(
        "parent-id",
        coreMessage,
      );

      const result = repository.getMessage(optimisticId);
      expect(result.parentId).toBe("parent-id");
    });

    it("should retry generating unique optimistic IDs if initial one exists", () => {
      mockGenerateOptimisticId.mockReturnValueOnce("__optimistic__existing-id");

      const existingMessage = createTestMessage({
        id: "__optimistic__existing-id",
      });
      repository.addOrUpdateMessage(null, existingMessage);

      mockGenerateOptimisticId.mockReturnValueOnce("__optimistic__unique-id");

      const coreMessage = createThreadMessageLike();
      const optimisticId = repository.appendOptimisticMessage(
        null,
        coreMessage,
      );

      expect(optimisticId).toBe("__optimistic__unique-id");
      expect(mockGenerateOptimisticId).toHaveBeenCalledTimes(2);
    });
  });

  describe("Export and import", () => {
    it("should export the repository state", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", child);

      const exported = repository.export();

      expect(exported.headId).toBe("child-id");
      expect(exported.messages).toHaveLength(2);
      expect(
        exported.messages.find((m) => m.message.id === "parent-id")?.parentId,
      ).toBeNull();
      expect(
        exported.messages.find((m) => m.message.id === "child-id")?.parentId,
      ).toBe("parent-id");
    });

    it("should import repository state", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child = createTestMessage({ id: "child-id" });

      const exported = {
        headId: "child-id",
        messages: [
          { message: parent, parentId: null },
          { message: child, parentId: "parent-id" },
        ],
      };

      repository.import(exported);

      expect(repository.headId).toBe("child-id");
      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual(["parent-id", "child-id"]);
    });

    it("should import with a specified head that is not the most recent message", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child1 = createTestMessage({ id: "child1-id" });
      const child2 = createTestMessage({ id: "child2-id" });

      const exported = {
        headId: "child1-id",
        messages: [
          { message: parent, parentId: null },
          { message: child1, parentId: "parent-id" },
          { message: child2, parentId: "parent-id" },
        ],
      };

      repository.import(exported);

      expect(repository.headId).toBe("child1-id");

      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual(["parent-id", "child1-id"]);

      repository.switchToBranch("child2-id");
      expect(repository.headId).toBe("child2-id");
    });

    it("should throw an error when importing with invalid parent references", () => {
      const child = createTestMessage({ id: "child-id" });

      const exported = {
        headId: "child-id",
        messages: [{ message: child, parentId: "non-existent-id" }],
      };

      expect(() => {
        repository.import(exported);
      }).toThrow(/Parent message not found/);
    });
  });

  describe("ExportedMessageRepository utility", () => {
    it("should convert an array of messages to repository format", () => {
      mockGenerateId.mockReturnValue("generated-id");

      const messages: ThreadMessageLike[] = [
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: "Hello" },
          ] as TextMessagePart[],
        },
        {
          role: "assistant" as const,
          content: [
            { type: "text" as const, text: "Hi there" },
          ] as TextMessagePart[],
        },
      ];

      const result = ExportedMessageRepository.fromArray(messages);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]!.parentId).toBeNull();
      expect(result.messages[1]!.parentId).toBe("generated-id");
    });

    it("should handle empty message arrays", () => {
      const result = ExportedMessageRepository.fromArray([]);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe("Complex scenarios", () => {
    it("should maintain tree structure after deletions", () => {
      const root = createTestMessage({ id: "root-id" });
      const nodeA = createTestMessage({ id: "A-id" });
      const nodeB = createTestMessage({ id: "B-id" });
      const nodeC = createTestMessage({ id: "C-id" });

      repository.addOrUpdateMessage(null, root);
      repository.addOrUpdateMessage("root-id", nodeA);
      repository.addOrUpdateMessage("A-id", nodeB);
      repository.addOrUpdateMessage("A-id", nodeC);

      repository.deleteMessage("B-id");

      repository.switchToBranch("C-id");
      expect(repository.headId).toBe("C-id");

      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual(["root-id", "A-id", "C-id"]);
    });

    it("should relink children when deleting a middle node", () => {
      const root = createTestMessage({ id: "root-id" });
      const nodeA = createTestMessage({ id: "A-id" });
      const nodeB = createTestMessage({ id: "B-id" });
      const nodeC = createTestMessage({ id: "C-id" });

      repository.addOrUpdateMessage(null, root);
      repository.addOrUpdateMessage("root-id", nodeA);
      repository.addOrUpdateMessage("A-id", nodeB);
      repository.addOrUpdateMessage("B-id", nodeC);

      repository.deleteMessage("B-id", "A-id");

      const c = repository.getMessage("C-id");
      expect(c.parentId).toBe("A-id");

      repository.switchToBranch("C-id");
      const messages = repository.getMessages();

      expect(messages.some((m) => m.id === "root-id")).toBe(true);
      expect(messages.some((m) => m.id === "A-id")).toBe(true);
      expect(messages.some((m) => m.id === "C-id")).toBe(true);
      expect(messages.some((m) => m.id === "B-id")).toBe(false);
    });

    it("should relink multiple children when deleting a parent node", () => {
      const root = createTestMessage({ id: "root-id" });
      const nodeA = createTestMessage({ id: "A-id" });
      const nodeB = createTestMessage({ id: "B-id" });
      const nodeC = createTestMessage({ id: "C-id" });
      const nodeD = createTestMessage({ id: "D-id" });

      repository.addOrUpdateMessage(null, root);
      repository.addOrUpdateMessage("root-id", nodeA);
      repository.addOrUpdateMessage("A-id", nodeB);
      repository.addOrUpdateMessage("A-id", nodeC);
      repository.addOrUpdateMessage("A-id", nodeD);

      repository.deleteMessage("A-id", "root-id");

      expect(repository.getMessage("B-id").parentId).toBe("root-id");
      expect(repository.getMessage("C-id").parentId).toBe("root-id");
      expect(repository.getMessage("D-id").parentId).toBe("root-id");

      repository.switchToBranch("B-id");
      const bMessages = repository.getMessages();
      expect(bMessages.some((m) => m.id === "root-id")).toBe(true);
      expect(bMessages.some((m) => m.id === "B-id")).toBe(true);
      expect(bMessages.some((m) => m.id === "A-id")).toBe(false);

      repository.switchToBranch("C-id");
      const cMessages = repository.getMessages();
      expect(cMessages.some((m) => m.id === "root-id")).toBe(true);
      expect(cMessages.some((m) => m.id === "C-id")).toBe(true);
      expect(cMessages.some((m) => m.id === "A-id")).toBe(false);

      repository.switchToBranch("D-id");
      const dMessages = repository.getMessages();
      expect(dMessages.some((m) => m.id === "root-id")).toBe(true);
      expect(dMessages.some((m) => m.id === "D-id")).toBe(true);
      expect(dMessages.some((m) => m.id === "A-id")).toBe(false);
    });

    it("should preserve message position when updating content", () => {
      const parent = createTestMessage({ id: "parent-id" });
      const child1 = createTestMessage({ id: "child1-id" });
      const child2 = createTestMessage({ id: "child2-id" });

      repository.addOrUpdateMessage(null, parent);
      repository.addOrUpdateMessage("parent-id", child1);
      repository.addOrUpdateMessage("child1-id", child2);

      const updatedChild1 = createTestMessage({
        id: "child1-id",
        content: [{ type: "text", text: "Updated content" }],
      });

      repository.addOrUpdateMessage("parent-id", updatedChild1);

      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual([
        "parent-id",
        "child1-id",
        "child2-id",
      ]);

      const MessagePart = messages[1]!.content[0];
      expect(MessagePart.type).toBe("text");
      expect((MessagePart as TextMessagePart).text).toBe("Updated content");
    });

    it("should handle re-parenting when messages are inserted at the start", () => {
      const messageA = createTestMessage({ id: "A" });
      const messageB = createTestMessage({ id: "B" });
      const messageC = createTestMessage({ id: "C" });

      repository.addOrUpdateMessage(null, messageA);
      repository.addOrUpdateMessage("A", messageB);
      repository.addOrUpdateMessage("B", messageC);

      expect(repository.getMessages().map((m) => m.id)).toEqual([
        "A",
        "B",
        "C",
      ]);
      expect(repository.headId).toBe("C");

      const messageX = createTestMessage({ id: "X" });
      const messageY = createTestMessage({ id: "Y" });

      repository.addOrUpdateMessage(null, messageX);
      repository.addOrUpdateMessage("X", messageY);

      repository.addOrUpdateMessage("Y", messageA);

      const messages = repository.getMessages();
      expect(messages.map((m) => m.id)).toEqual(["X", "Y", "A", "B", "C"]);

      expect(repository.getMessage("X").parentId).toBeNull();
      expect(repository.getMessage("Y").parentId).toBe("X");
      expect(repository.getMessage("A").parentId).toBe("Y");
      expect(repository.getMessage("B").parentId).toBe("A");
      expect(repository.getMessage("C").parentId).toBe("B");

      expect(repository.headId).toBe("C");
    });
  });
});
