import type { ThreadMessage } from "../../types/AssistantTypes";
import { generateOptimisticId } from "./idUtils";

type RepositoryParent = {
  children: string[];
};

type RepositoryMessage = RepositoryParent & {
  prev: RepositoryMessage | null;
  current: ThreadMessage;
  next: RepositoryMessage | null;
  level: number;
};

const findHead = (message: RepositoryMessage): RepositoryMessage => {
  if (message.next) return findHead(message.next);
  return message;
};

export class MessageRepository {
  private messages = new Map<string, RepositoryMessage>(); // message_id -> item
  private head: RepositoryMessage | null = null;
  private root: RepositoryParent = {
    children: [],
  };

  private performOp(
    newParent: RepositoryMessage | null,
    child: RepositoryMessage,
    operation: "cut" | "link" | "relink",
  ) {
    const parentOrRoot = child.prev ?? this.root;
    const newParentOrRoot = newParent ?? this.root;

    if (operation === "relink" && parentOrRoot === newParentOrRoot) return;

    // cut
    if (operation !== "link") {
      parentOrRoot.children = parentOrRoot.children.filter(
        (m) => m !== child.current.id,
      );

      if (child.prev?.next === child) {
        const fallbackId = child.prev.children.at(-1);
        const fallback = fallbackId ? this.messages.get(fallbackId) : null;
        if (fallback === undefined) {
          throw new Error(
            "MessageRepository(performOp/cut): Fallback sibling message not found. This is likely an internal bug in assistant-ui.",
          );
        }
        child.prev.next = fallback;
      }
    }

    // link
    if (operation !== "cut") {
      newParentOrRoot.children = [
        ...newParentOrRoot.children,
        child.current.id,
      ];

      if (
        newParent &&
        (findHead(child) === this.head || newParent.next === null)
      ) {
        newParent.next = child;
      }

      child.prev = newParent;
    }
  }
  getMessages() {
    const messages = new Array<ThreadMessage>(this.head?.level ?? 0);
    for (let current = this.head; current; current = current.prev) {
      messages[current.level] = current.current;
    }
    return messages;
  }

  addOrUpdateMessage(parentId: string | null, message: ThreadMessage) {
    const existingItem = this.messages.get(message.id);
    const prev = parentId ? this.messages.get(parentId) : null;
    if (prev === undefined)
      throw new Error(
        "MessageRepository(addOrUpdateMessage): Parent message not found. This is likely an internal bug in assistant-ui.",
      );

    // update existing message
    if (existingItem) {
      existingItem.current = message;
      this.performOp(prev, existingItem, "relink");
      return;
    }

    // create a new message
    const newItem: RepositoryMessage = {
      prev,
      current: message,
      next: null,
      children: [],
      level: prev ? prev.level + 1 : 0,
    };

    this.messages.set(message.id, newItem);
    this.performOp(prev, newItem, "link");

    if (this.head === prev) {
      this.head = newItem;
    }
  }

  appendOptimisticMessage(
    parentId: string | null,
    message: Omit<ThreadMessage, "id" | "createdAt">,
  ) {
    let optimisticId: string;
    do {
      optimisticId = generateOptimisticId();
    } while (this.messages.has(optimisticId));

    this.addOrUpdateMessage(parentId, {
      ...message,
      id: optimisticId,
      createdAt: new Date(),
      ...(message.role === "assistant" ? { status: "in_progress" } : undefined),
    } as ThreadMessage);

    return optimisticId;
  }

  deleteMessage(messageId: string, replacementId?: string | null | undefined) {
    const message = this.messages.get(messageId);

    if (!message)
      throw new Error(
        "MessageRepository(deleteMessage): Optimistic message not found. This is likely an internal bug in assistant-ui.",
      );

    const replacement =
      replacementId === undefined
        ? message.prev // if no replacementId is provided, use the parent
        : replacementId === null
          ? null
          : this.messages.get(replacementId);
    if (replacement === undefined)
      throw new Error(
        "MessageRepository(deleteMessage): Replacement not found. This is likely an internal bug in assistant-ui.",
      );

    for (const child of message.children) {
      const childMessage = this.messages.get(child);
      if (!childMessage)
        throw new Error(
          "MessageRepository(deleteMessage): Child message not found. This is likely an internal bug in assistant-ui.",
        );
      this.performOp(replacement, childMessage, "relink");
    }

    this.performOp(null, message, "cut");
    this.messages.delete(messageId);

    if (this.head === message) {
      this.head = replacement ? findHead(replacement) : null;
    }
  }

  getBranches(messageId: string) {
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(getBranches): Message not found. This is likely an internal bug in assistant-ui.",
      );

    const { children } = message.prev ?? this.root;
    return children;
  }

  switchToBranch(messageId: string) {
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(switchToBranch): Branch not found. This is likely an internal bug in assistant-ui.",
      );

    if (message.prev) {
      message.prev.next = message;
    }

    this.head = findHead(message);
  }

  resetHead(messageId: string | null) {
    if (messageId === null) {
      this.head = null;
      return;
    }

    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(resetHead): Branch not found. This is likely an internal bug in assistant-ui.",
      );

    this.head = message;
    for (
      let current: RepositoryMessage | null = message;
      current;
      current = current.prev
    ) {
      if (current.prev) {
        current.prev.next = current;
      }
    }
  }
}
