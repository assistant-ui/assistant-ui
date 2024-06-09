import type { Message } from "ai";
import { type StoreApi, type UseBoundStore, create } from "zustand";
import type {
  AppendMessage,
  ThreadMessage,
} from "../../../../utils/AssistantTypes";
import type {
  ReactAssistantRuntime,
  Unsubscribe,
} from "../../../core/AssistantRuntime";
import { MessageRepository } from "../../../utils/MessageRepository";
import { getVercelAIMessage } from "../../utils/VercelThreadMessage";
import { useVercelThreadSync } from "./useVercelThreadSync";
import type { VercelHelpers } from "./utils/VercelHelpers";
import { sliceMessagesUntil } from "./utils/sliceMessagesUntil";
import { useVercelComposerSync } from "./utils/useVercelComposerSync";

const hasUpcomingMessage = (isRunning: boolean, messages: ThreadMessage[]) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class VercelUseChatRuntime implements ReactAssistantRuntime {
  private _subscriptions = new Set<() => void>();
  private repository = new MessageRepository();
  private assistantOptimisticId: string | null = null;

  private useVercel: UseBoundStore<StoreApi<{ vercel: VercelHelpers }>>;

  public messages: ThreadMessage[] = [];
  public isRunning = false;

  public onVercelUpdated() {
    if (this.useVercel.getState().vercel !== this.vercel) {
      this.useVercel.setState({ vercel: this.vercel });
    }
  }

  constructor(public vercel: VercelHelpers) {
    this.useVercel = create(() => ({
      vercel,
    }));
  }

  public getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    this.repository.switchToBranch(branchId);
    this.vercel.setMessages(
      (this.repository.getMessages() as ThreadMessage[])
        .map(getVercelAIMessage)
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

  public cancelRun(): void {
    console.log("cancel", this.vercel);
    const lastMessage = this.vercel.messages.at(-1);
    this.vercel.stop();

    // TODO not working
    if (lastMessage?.role === "user") {
      this.vercel.setInput(lastMessage.content);
    }
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private updateData = (isRunning: boolean, vm: ThreadMessage[]) => {
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
  };

  unstable_synchronizer = () => {
    const { vercel } = this.useVercel();

    useVercelThreadSync(vercel, this.updateData);
    useVercelComposerSync(vercel);

    return null;
  };
}
