import type { CoreMessage, ThreadMessage } from "../../types/AssistantTypes";
import { generateOptimisticId } from "../../utils/idUtils";
import { fromCoreMessage } from "../edge/converters/fromCoreMessage";

type RepositoryParent = {
  children: string[];
  next: RepositoryMessage | null;
};

type RepositoryMessage = RepositoryParent & {
  prev: RepositoryMessage | null;
  current: ThreadMessage;
  level: number;
};

export interface ExportedMessageRepository {
  headId?: string | null;
  messages: Array<{
    message: ThreadMessage;
    parentId: string | null;
  }>;
}

const findHead = (
  message: RepositoryMessage | RepositoryParent,
): RepositoryMessage | null => {
  if (message.next) return findHead(message.next);
  if ("current" in message) return message;
  return null;
};

export class MessageRepository {
  private messages = new Map<string, RepositoryMessage>(); // message_id -> item
  private head: RepositoryMessage | null = null;
  private root: RepositoryParent = {
    children: [],
    next: null,
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
      // remove from parentOrRoot.children
      parentOrRoot.children = parentOrRoot.children.filter(
        (m) => m !== child.current.id,
      );

      // update parentOrRoot.next
      if (parentOrRoot.next === child) {
        const fallbackId = parentOrRoot.children.at(-1);
        const fallback = fallbackId ? this.messages.get(fallbackId) : null;
        if (fallback === undefined) {
          throw new Error(
            "MessageRepository(performOp/cut): Fallback sibling message not found. This is likely an internal bug in assistant-ui.",
          );
        }
        parentOrRoot.next = fallback;
      }
    }

    // link
    if (operation !== "cut") {
      // ensure the child is not part of parent tree
      for (
        let current: RepositoryMessage | null = newParent;
        current;
        current = current.prev
      ) {
        if (current.current.id === child.current.id) {
          throw new Error(
            "MessageRepository(performOp/link): A message with the same id already exists in the parent tree. This error occurs if the same message id is found multiple times. This is likely an internal bug in assistant-ui.",
          );
        }
      }

      // add to parentOrRoot.children
      newParentOrRoot.children = [
        ...newParentOrRoot.children,
        child.current.id,
      ];

      // update parentOrRoot.next
      if (findHead(child) === this.head || newParentOrRoot.next === null) {
        newParentOrRoot.next = child;
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

  getMessage(messageId: string) {
    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(updateMessage): Message not found. This is likely an internal bug in assistant-ui.",
      );

    return {
      parentId: message.prev?.current.id ?? null,
      message: message.current,
    };
  }

  appendOptimisticMessage(parentId: string | null, message: CoreMessage) {
    let optimisticId: string;
    do {
      optimisticId = generateOptimisticId();
    } while (this.messages.has(optimisticId));

    this.addOrUpdateMessage(
      parentId,
      fromCoreMessage(message, {
        id: optimisticId,
        status: { type: "running" },
      }),
    );

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
      this.head = findHead(replacement ?? this.root);
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

    const prevOrRoot = message.prev ?? this.root;
    prevOrRoot.next = message;

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

  export(): ExportedMessageRepository {
    const exportItems: ExportedMessageRepository["messages"] = [];

    // hint: we are relying on the insertion order of the messages
    // this is important for the import function to properly link the messages
    for (const [, message] of this.messages) {
      exportItems.push({
        message: message.current,
        parentId: message.prev?.current.id ?? null,
      });
    }

    return {
      headId: this.head?.current.id ?? null,
      messages: exportItems,
    };
  }

  import({ headId, messages }: ExportedMessageRepository) {
    for (const { message, parentId } of messages) {
      this.addOrUpdateMessage(parentId, message);
    }

    // switch to the saved head id if it is not the most recent message
    this.resetHead(headId ?? messages.at(-1)?.message.id ?? null);
  }
}
