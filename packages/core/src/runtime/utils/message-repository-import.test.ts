import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "../../types/message";
import {
  MessageRepository,
  replaceMessageRepository,
  type ExportedMessageRepository,
} from "./message-repository";

const message = (id: string): ThreadMessage =>
  ({
    id,
    role: "user",
    content: [{ type: "text", text: id }],
    attachments: [],
    metadata: { custom: {} },
    createdAt: new Date(0),
  }) as ThreadMessage;

const seeded = () => {
  const repository = new MessageRepository();
  repository.addOrUpdateMessage(null, message("a"));
  repository.addOrUpdateMessage("a", message("b"));
  repository.addOrUpdateMessage("a", message("c"));
  repository.switchToBranch("b");
  return repository;
};

const state = (repository: MessageRepository) => ({
  headId: repository.headId,
  messages: repository.getMessages().map(({ id }) => id),
  exported: repository.export(),
  branches: repository.getBranches("b"),
});

const bad: ExportedMessageRepository[] = [
  // the parent of "y" is not in the repository or the import
  {
    headId: "y",
    messages: [
      { message: message("x"), parentId: null },
      { message: message("y"), parentId: "missing" },
    ],
  },
  // the head is not among the messages
  {
    headId: "missing",
    messages: [{ message: message("x"), parentId: "b" }],
  },
  // moving "a" under its own descendant
  {
    headId: "a",
    messages: [{ message: message("a"), parentId: "b" }],
  },
];

describe("MessageRepository.import", () => {
  it.each(bad.map((data, index) => [index, data] as const))(
    "leaves the repository unchanged when import %i throws",
    (_index, data) => {
      const repository = seeded();
      const before = state(repository);
      const messagesBefore = repository.getMessages();

      expect(() => repository.import(data)).toThrow();

      expect(state(repository)).toEqual(before);
      expect(repository.getMessages()).toEqual(messagesBefore);
      // the restored tree still accepts changes
      repository.addOrUpdateMessage("b", message("d"));
      expect(repository.getMessages().map(({ id }) => id)).toEqual([
        "a",
        "b",
        "d",
      ]);
    },
  );

  it("still merges a valid import into the existing messages", () => {
    const repository = seeded();
    repository.import({
      headId: "x",
      messages: [{ message: message("x"), parentId: "c" }],
    });
    expect(repository.getMessages().map(({ id }) => id)).toEqual([
      "a",
      "c",
      "x",
    ]);
  });
});

describe("replaceMessageRepository", () => {
  it.each(bad.map((data, index) => [index, data] as const))(
    "keeps the existing messages when replacement %i cannot be placed",
    (_index, data) => {
      const repository = seeded();
      const before = state(repository);

      expect(() => replaceMessageRepository(repository, data)).toThrow();

      expect(state(repository)).toEqual(before);
    },
  );

  it("replaces the messages with a valid import", () => {
    const repository = seeded();
    replaceMessageRepository(repository, {
      headId: "y",
      messages: [
        { message: message("x"), parentId: null },
        { message: message("y"), parentId: "x" },
      ],
    });
    expect(repository.getMessages().map(({ id }) => id)).toEqual(["x", "y"]);
    expect(() => repository.getMessage("a")).toThrow();
  });
});
