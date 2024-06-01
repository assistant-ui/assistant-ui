"use client";

import { customAlphabet } from "nanoid/non-secure";
import type { ThreadMessage } from "../utils/context/stores/AssistantTypes";

const generateId = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
);

const optimisticPrefix = "__optimistic__";
const generateOptimisticId = () => `${optimisticPrefix}${generateId()}`;
export const isOptimisticId = (id: string) => id.startsWith(optimisticPrefix);

type RepositoryMessage = {
  prev: RepositoryMessage | null;
  current: ThreadMessage;
  next: RepositoryMessage | null;
  children: string[];
  level: number;
};

const findHead = (message: RepositoryMessage): RepositoryMessage => {
  if (message.next) return findHead(message.next);
  return message;
};

export class MessageRepository {
  private messages = new Map<string, RepositoryMessage>(); // message_id -> item
  private head: RepositoryMessage | null = null;
  private rootChildren: string[] = [];

  getMessages() {
    const messages = new Array<ThreadMessage>(this.head?.level ?? 0);
    for (let current = this.head; current; current = current.prev) {
      messages[current.level] = current.current;
    }
    return messages;
  }

  addOrUpdateMessage(message: ThreadMessage) {
    const item = this.messages.get(message.id);
    if (item) {
      if (item.current.parentId !== message.parentId) {
        // if the parents dont match, delete the message and create a new one
        this.deleteMessage(message.id);
      } else {
        item.current = message;
        return;
      }
    }

    // create a new message
    const prev = message.parentId ? this.messages.get(message.parentId) : null;
    if (prev === undefined)
      throw new Error("Unexpected: Parent message not found");

    const newItem: RepositoryMessage = {
      prev,
      current: message,
      next: null,
      children: [],
      level: prev ? prev.level + 1 : 0,
    };
    this.messages.set(message.id, newItem);

    if (prev) {
      prev.children = [...prev.children, message.id];
    } else {
      this.rootChildren = [...this.rootChildren, message.id];
    }

    if (this.head === prev) {
      this.head = newItem;

      if (prev) {
        prev.next = newItem;
      }
    }
  }

  deleteMessage(messageId: string) {
    const message = this.messages.get(messageId);
    if (!message) throw new Error("Unexpected: Message not found");

    if (message.children.length > 0) {
      for (const child of message.children) {
        this.deleteMessage(child);
      }
    }

    this.messages.delete(messageId);

    if (message.prev) {
      message.prev.children = message.prev.children.filter(
        (m) => m !== messageId,
      );

      if (message.prev.next === message) {
        const childId = message.prev.children.at(-1);
        const child = childId ? this.messages.get(childId) : null;
        if (child === undefined)
          throw new Error("Unexpected: Child message not found");
        message.prev.next = child;
      }
    } else {
      this.rootChildren = this.rootChildren.filter((m) => m !== messageId);
    }

    if (this.head === message) {
      this.head = message.prev ? findHead(message.prev) : null;
    }
  }

  private getOptimisticId = () => {
    let optimisticId: string;
    do {
      optimisticId = generateOptimisticId();
    } while (this.messages.has(optimisticId));

    return optimisticId;
  };

  commitOptimisticRun(parentId: string | null) {
    const optimisticId = this.getOptimisticId();
    this.addOrUpdateMessage({
      id: optimisticId,
      role: "assistant",
      content: [
        {
          type: "text",
          text: "",
        },
      ],
      parentId,
      createdAt: new Date(),
    });
    return optimisticId;
  }

  // TODO switch to back to messageId
  getBranches(parentId: string | null) {
    if (parentId === null) return this.rootChildren;

    const message = this.messages.get(parentId);
    if (!message) throw new Error("Unexpected: Parent message not found");
    return message.children;
  }

  switchToBranch(messageId: string) {
    const message = this.messages.get(messageId);
    if (!message) throw new Error("Unexpected: Branch not found");

    if (message.prev) {
      message.prev.next = message;
    }

    this.head = findHead(message);
  }

  resetHead(messageId: string | null) {
    if (messageId) {
      const message = this.messages.get(messageId);
      if (!message) throw new Error("Unexpected: Branch not found");
      this.head = message;
      console.log("resetHead", message.current.id, message);
      for (
        let current: RepositoryMessage | null = message;
        current;
        current = current.prev
      ) {
        if (current.prev) {
          current.prev.next = current;
        }
      }
    } else {
      this.head = null;
    }
  }
}
