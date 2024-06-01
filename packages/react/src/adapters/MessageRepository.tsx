"use client";

import type { ThreadMessage } from "../utils/context/stores/AssistantTypes";

export class MessageRepository {
  private children = new Map<string, string[]>(); // parent_id -> child_ids
  private branches = new Map<string, ThreadMessage[]>(); // message_id -> branch

  head: ThreadMessage[] = [];

  getBranches(parentId: string) {
    return this.children.get(parentId) ?? [];
  }

  checkout(messageId: string) {
    const branch = this.branches.get(messageId);
    if (!branch) throw new Error("Unexpected: Branch not found");
    this.resetHead(branch);
  }

  resetHead(branch: ThreadMessage[]) {
    this.head = branch;
    for (const message of branch) {
      const parentArray = this.children.get(message.parentId);
      if (!parentArray) {
        this.children.set(message.parentId, [message.id]);
      } else if (!parentArray.includes(message.id)) {
        parentArray.push(message.id);
      }

      this.branches.set(message.id, this.head);
    }
  }
}
