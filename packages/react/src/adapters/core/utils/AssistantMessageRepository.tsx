"use client";
import type { ThreadMessage } from "../../../utils/context/stores/AssistantTypes";
import { MessageRepository } from "../../MessageRepository";

export class AssistantMessageRepository {
  private repository = new MessageRepository();

  constructor(
    private readonly flushCallback: (messages: ThreadMessage[]) => void,
  ) {}

  getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  withModifications<T>(callback: (repository: MessageRepository) => T) {
    const res = callback(this.repository);
    this.flushCallback(this.repository.getMessages());
    return res;
  }
}
