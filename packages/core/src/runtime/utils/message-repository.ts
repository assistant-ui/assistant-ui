import type { RunConfig, ThreadMessage } from "../../types";
import { generateId, generateOptimisticId } from "../../utils/id";
import type { ThreadMessageLike } from "./thread-message-like";
import { getAutoStatus } from "./auto-status";
import { fromThreadMessageLike } from "./thread-message-like";

export type ExportedMessageRepositoryItem = {
  message: ThreadMessage;
  parentId: string | null;
  runConfig?: RunConfig;
};

export type ExportedMessageRepository = {
  headId?: string | null;
  messages: Array<{
    message: ThreadMessage;
    parentId: string | null;
    runConfig?: RunConfig;
  }>;
};

export const ExportedMessageRepository = {
  fromArray: (
    messages: readonly ThreadMessageLike[],
  ): ExportedMessageRepository => {
    const conv = messages.map((m) =>
      fromThreadMessageLike(
        m,
        generateId(),
        getAutoStatus(false, false, false, false, undefined),
      ),
    );

    return {
      messages: conv.map((m, idx) => ({
        parentId: idx > 0 ? conv[idx - 1]!.id : null,
        message: m,
      })),
    };
  },
};

type RepositoryParent = {
  children: string[];
  next: RepositoryMessage | null;
};

type RepositoryMessage = RepositoryParent & {
  prev: RepositoryMessage | null;
  current: ThreadMessage;
  level: number;
};

const findHead = (
  message: RepositoryMessage | RepositoryParent,
): RepositoryMessage | null => {
  if (message.next) return findHead(message.next);
  if ("current" in message) return message;
  return null;
};

class CachedValue<T> {
  private _value: T | null = null;

  constructor(private func: () => T) {}

  get value() {
    if (this._value === null) {
      this._value = this.func();
    }
    return this._value;
  }

  dirty() {
    this._value = null;
  }
}

export class MessageRepository {
  private messages = new Map<string, RepositoryMessage>();
  private head: RepositoryMessage | null = null;
  private root: RepositoryParent = {
    children: [],
    next: null,
  };

  private updateLevels(message: RepositoryMessage, newLevel: number) {
    message.level = newLevel;
    for (const childId of message.children) {
      const childMessage = this.messages.get(childId);
      if (childMessage) {
        this.updateLevels(childMessage, newLevel + 1);
      }
    }
  }

  private performOp(
    newParent: RepositoryMessage | null,
    child: RepositoryMessage,
    operation: "cut" | "link" | "relink",
  ) {
    const parentOrRoot = child.prev ?? this.root;
    const newParentOrRoot = newParent ?? this.root;

    if (operation === "relink" && parentOrRoot === newParentOrRoot) return;

    if (operation !== "link") {
      parentOrRoot.children = parentOrRoot.children.filter(
        (m) => m !== child.current.id,
      );

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

    if (operation !== "cut") {
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

      newParentOrRoot.children = [
        ...newParentOrRoot.children,
        child.current.id,
      ];

      if (findHead(child) === this.head || newParentOrRoot.next === null) {
        newParentOrRoot.next = child;
      }

      child.prev = newParent;

      const newLevel = newParent ? newParent.level + 1 : 0;
      this.updateLevels(child, newLevel);
    }
  }

  private _messages = new CachedValue<readonly ThreadMessage[]>(() => {
    const messages = new Array<ThreadMessage>((this.head?.level ?? -1) + 1);
    for (let current = this.head; current; current = current.prev) {
      messages[current.level] = current.current;
    }
    return messages;
  });

  get headId() {
    return this.head?.current.id ?? null;
  }

  getMessages(headId?: string) {
    if (headId === undefined || headId === this.head?.current.id) {
      return this._messages.value;
    }

    const headMessage = this.messages.get(headId);
    if (!headMessage) {
      throw new Error(
        "MessageRepository(getMessages): Head message not found. This is likely an internal bug in assistant-ui.",
      );
    }

    const messages = new Array<ThreadMessage>(headMessage.level + 1);
    for (
      let current: RepositoryMessage | null = headMessage;
      current;
      current = current.prev
    ) {
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

    if (existingItem) {
      existingItem.current = message;
      this.performOp(prev, existingItem, "relink");
      this._messages.dirty();
      return;
    }

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

    this._messages.dirty();
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
      index: message.level,
    };
  }

  appendOptimisticMessage(parentId: string | null, message: ThreadMessageLike) {
    let optimisticId: string;
    do {
      optimisticId = generateOptimisticId();
    } while (this.messages.has(optimisticId));

    this.addOrUpdateMessage(
      parentId,
      fromThreadMessageLike(message, optimisticId, { type: "running" }),
    );

    return optimisticId;
  }

  deleteMessage(messageId: string, replacementId?: string | null | undefined) {
    const message = this.messages.get(messageId);

    if (!message)
      throw new Error(
        "MessageRepository(deleteMessage): Message not found. This is likely an internal bug in assistant-ui.",
      );

    const replacement =
      replacementId === undefined
        ? message.prev
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

    this._messages.dirty();
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

    this._messages.dirty();
  }

  resetHead(messageId: string | null) {
    if (messageId === null) {
      this.clear();
      return;
    }

    const message = this.messages.get(messageId);
    if (!message)
      throw new Error(
        "MessageRepository(resetHead): Branch not found. This is likely an internal bug in assistant-ui.",
      );

    if (message.children.length > 0) {
      const deleteDescendants = (msg: RepositoryMessage) => {
        for (const childId of msg.children) {
          const childMessage = this.messages.get(childId);
          if (childMessage) {
            deleteDescendants(childMessage);
            this.messages.delete(childId);
          }
        }
      };
      deleteDescendants(message);

      message.children = [];
      message.next = null;
    }

    this.head = message;
    for (
      let current: RepositoryMessage | null = message;
      current;
      current = current.prev
    ) {
      if (current.prev) {
        current.prev.next = current;
      } else {
        this.root.next = current;
      }
    }

    this._messages.dirty();
  }

  clear(): void {
    this.messages.clear();
    this.head = null;
    this.root = {
      children: [],
      next: null,
    };
    this._messages.dirty();
  }

  export(): ExportedMessageRepository {
    const exportItems: ExportedMessageRepository["messages"] = [];

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

    this.resetHead(headId ?? messages.at(-1)?.message.id ?? null);
  }
}
