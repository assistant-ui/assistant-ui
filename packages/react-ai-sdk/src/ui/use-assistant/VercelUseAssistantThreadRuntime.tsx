import {
  type ReactThreadRuntime,
  type Unsubscribe,
  type AppendMessage,
  type ThreadMessage,
} from "@assistant-ui/react";
import { type StoreApi, type UseBoundStore, create } from "zustand";
import { useVercelAIComposerSync } from "../utils/useVercelAIComposerSync";
import { useVercelAIThreadSync } from "../utils/useVercelAIThreadSync";
import { useAssistant } from "ai/react";
import { hasUpcomingMessage } from "./VercelUseAssistantRuntime";

const EMPTY_BRANCHES: readonly string[] = Object.freeze([]);

const CAPABILITIES = Object.freeze({
  edit: false,
  reload: false,
  cancel: false,
  copy: true,
});

export class VercelUseAssistantThreadRuntime implements ReactThreadRuntime {
  private _subscriptions = new Set<() => void>();

  public readonly capabilities = CAPABILITIES;

  private useVercel: UseBoundStore<
    StoreApi<{ vercel: ReturnType<typeof useAssistant> }>
  >;

  public messages: readonly ThreadMessage[] = [];
  public isRunning = false;

  constructor(public vercel: ReturnType<typeof useAssistant>) {
    this.useVercel = create(() => ({
      vercel,
    }));
  }

  public getBranches(): readonly string[] {
    return EMPTY_BRANCHES;
  }

  public switchToBranch(): void {
    throw new Error(
      "VercelUseAssistantRuntime does not support switching branches.",
    );
  }

  public async append(message: AppendMessage): Promise<void> {
    // add user message
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("VercelUseAssistantRuntime only supports text content.");

    if (message.parentId !== (this.messages.at(-1)?.id ?? null))
      throw new Error(
        "VercelUseAssistantRuntime does not support editing messages.",
      );

    await this.vercel.append({
      role: "user",
      content: message.content[0].text,
    });
  }

  public async startRun(): Promise<void> {
    throw new Error("VercelUseAssistantRuntime does not support reloading.");
  }

  public cancelRun(): void {
    const previousMessage = this.vercel.messages.at(-1);

    this.vercel.stop();
    if (previousMessage?.role === "user") {
      this.vercel.setInput(previousMessage.content);
    }
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  public onVercelUpdated() {
    if (this.useVercel.getState().vercel !== this.vercel) {
      this.useVercel.setState({ vercel: this.vercel });
    }
  }

  private updateData = (isRunning: boolean, vm: ThreadMessage[]) => {
    if (hasUpcomingMessage(isRunning, vm)) {
      vm.push({
        id: "__optimistic__result",
        createdAt: new Date(),
        status: { type: "in_progress" },
        role: "assistant",
        content: [{ type: "text", text: "" }],
      });
    }

    this.messages = vm;
    this.isRunning = isRunning;

    for (const callback of this._subscriptions) callback();
  };

  unstable_synchronizer = () => {
    const { vercel } = this.useVercel();

    useVercelAIThreadSync(vercel, this.updateData);
    useVercelAIComposerSync(vercel);

    return null;
  };

  addToolResult() {
    throw new Error(
      "VercelUseAssistantRuntime does not support adding tool results.",
    );
  }
}
