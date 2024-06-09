"use client";

import type { Message } from "ai";
import type { UseAssistantHelpers, UseChatHelpers } from "ai/react";
import type {
  AppendMessage,
  ThreadMessage,
} from "../../../utils/context/stores/AssistantTypes";
import { MessageRepository } from "../../MessageRepository";
import { getVercelMessage } from "../../vercel/VercelThreadMessage";
import type { AssistantRuntime, Unsubscribe } from "../AssistantRuntime";

const sliceMessagesUntil = (messages: Message[], messageId: string | null) => {
  if (messageId == null) return [];

  const messageIdx = messages.findIndex((m) => m.id === messageId);
  if (messageIdx === -1)
    throw new Error(
      "useVercelAIThreadState: Message not found. This is liekly an internal bug in assistant-ui.",
    );

  return messages.slice(0, messageIdx + 1);
};

const hasUpcomingMessage = (isRunning: boolean, messages: ThreadMessage[]) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class VercelUseChatRuntime implements AssistantRuntime {
  private _subscriptions = new Set<() => void>();
  private repository = new MessageRepository();
  private assistantOptimisticId: string | null = null;

  public messages: ThreadMessage[] = [];
  public isRunning = false;

  constructor(public vercel: UseChatHelpers | UseAssistantHelpers) {}

  public getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    this.repository.switchToBranch(branchId);
    this.vercel.setMessages(
      (this.repository.getMessages() as ThreadMessage[])
        .map(getVercelMessage)
        .filter((m): m is Message => m != null),
    );
  }

  public async append(message: AppendMessage): Promise<void> {
    // add user message
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported by Vercel AI SDK.");

    const newMessages = sliceMessagesUntil(
      this.vercel.messages,
      message.parentId,
    );
    this.vercel.setMessages(newMessages);

    await this.vercel.append({
      role: "user",
      content: message.content[0].text,
    });
  }

  public async startRun(parentId: string | null): Promise<void> {
    const reloadMaybe =
      "reload" in this.vercel ? this.vercel.reload : undefined;
    if (!reloadMaybe)
      throw new Error(
        "Reload is not supported by Vercel AI SDK's useAssistant.",
      );

    const newMessages = sliceMessagesUntil(this.vercel.messages, parentId);
    this.vercel.setMessages(newMessages);

    await reloadMaybe();
  }

  cancelRun(): void {
    const lastMessage = this.vercel.messages.at(-1);
    this.vercel.stop();

    if (lastMessage?.role === "user") {
      this.vercel.setInput(lastMessage.content);
    }
  }

  public updateData(isRunning: boolean, vm: ThreadMessage[]) {
    for (let i = 0; i < vm.length; i++) {
      const message = vm[i]!;
      const parent = vm[i - 1];
      this.repository.addOrUpdateMessage(parent?.id ?? null, message);
    }

    if (this.assistantOptimisticId) {
      this.repository.deleteMessage(this.assistantOptimisticId, null);
      this.assistantOptimisticId = null;
    }

    if (hasUpcomingMessage(isRunning, vm)) {
      this.assistantOptimisticId = this.repository.appendOptimisticMessage(
        vm.at(-1)?.id ?? null,
        {
          role: "assistant",
          content: [{ type: "text", text: "" }],
        },
      );
    }

    this.repository.resetHead(
      this.assistantOptimisticId ?? vm.at(-1)?.id ?? null,
    );

    this.messages = this.repository.getMessages();
    this.isRunning = isRunning;

    for (const callback of this._subscriptions) callback();
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }
}
