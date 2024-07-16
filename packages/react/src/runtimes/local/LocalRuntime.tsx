import type {
  AppendMessage,
  CoreMessage,
  ThreadAssistantMessage,
  ThreadUserMessage,
} from "../../types/AssistantTypes";
import { type ModelConfigProvider } from "../../types/ModelConfigTypes";
import type { Unsubscribe } from "../../types/Unsubscribe";
import { ThreadRuntime } from "../core";
import { MessageRepository } from "../utils/MessageRepository";
import { generateId } from "../../utils/idUtils";
import { BaseAssistantRuntime } from "../core/BaseAssistantRuntime";
import type { ChatModelAdapter, ChatModelRunResult } from "./ChatModelAdapter";
import { AddToolResultOptions } from "../../context";
import { ProxyConfigProvider } from "../../internal";
import { fromCoreMessages } from "../edge";

const shouldContinue = (result: ThreadAssistantMessage) =>
  result.status?.type === "requires-action" &&
  result.status.reason === "tool-calls" &&
  result.content.every((c) => c.type !== "tool-call" || !!c.result);

export type LocalRuntimeOptions = {
  initialMessages?: readonly CoreMessage[] | undefined;
  maxToolRoundtrips?: number;
};

export class LocalRuntime extends BaseAssistantRuntime<LocalThreadRuntime> {
  private readonly _proxyConfigProvider: ProxyConfigProvider;

  constructor(adapter: ChatModelAdapter, options?: LocalRuntimeOptions) {
    const proxyConfigProvider = new ProxyConfigProvider();
    super(new LocalThreadRuntime(proxyConfigProvider, adapter, options));
    this._proxyConfigProvider = proxyConfigProvider;
  }

  public set adapter(adapter: ChatModelAdapter) {
    this.thread.adapter = adapter;
  }

  registerModelConfigProvider(provider: ModelConfigProvider) {
    return this._proxyConfigProvider.registerModelConfigProvider(provider);
  }

  public switchToThread(threadId: string | null) {
    if (threadId) {
      throw new Error("LocalRuntime does not yet support switching threads");
    }

    return (this.thread = new LocalThreadRuntime(
      this._proxyConfigProvider,
      this.thread.adapter,
    ));
  }
}

const CAPABILITIES = Object.freeze({
  edit: true,
  reload: true,
  cancel: true,
  copy: true,
});

class LocalThreadRuntime implements ThreadRuntime {
  private _subscriptions = new Set<() => void>();

  private abortController: AbortController | null = null;
  private readonly repository = new MessageRepository();

  public readonly capabilities = CAPABILITIES;

  public get messages() {
    return this.repository.getMessages();
  }
  public get isRunning() {
    return this.abortController != null;
  }

  constructor(
    private configProvider: ModelConfigProvider,
    public adapter: ChatModelAdapter,
    private options?: LocalRuntimeOptions,
  ) {
    if (options?.initialMessages) {
      let parentId: string | null = null;
      const messages = fromCoreMessages(options.initialMessages);
      for (const message of messages) {
        this.repository.addOrUpdateMessage(parentId, message);
        parentId = message.id;
      }
    }
  }

  public getBranches(messageId: string): string[] {
    return this.repository.getBranches(messageId);
  }

  public switchToBranch(branchId: string): void {
    this.repository.switchToBranch(branchId);
    this.notifySubscribers();
  }

  public async append(message: AppendMessage): Promise<void> {
    if (message.role !== "user")
      throw new Error(
        "Only appending user messages are supported in LocalRuntime. This is likely an internal bug in assistant-ui.",
      );

    // add user message
    const userMessageId = generateId();
    const userMessage: ThreadUserMessage = {
      id: userMessageId,
      role: "user",
      content: message.content,
      createdAt: new Date(),
    };
    this.repository.addOrUpdateMessage(message.parentId, userMessage);

    await this.startRun(userMessageId);
  }

  public async startRun(parentId: string | null): Promise<void> {
    this.repository.resetHead(parentId);

    // add assistant message
    const id = generateId();
    let message: ThreadAssistantMessage = {
      id,
      role: "assistant",
      status: { type: "running" },
      content: [{ type: "text", text: "" }],
      createdAt: new Date(),
    };

    do {
      message = await this.performRoundtrip(parentId, message);
    } while (shouldContinue(message));
  }

  private async performRoundtrip(
    parentId: string | null,
    message: ThreadAssistantMessage,
  ) {
    const messages = this.repository.getMessages();

    // abort existing run
    this.abortController?.abort();
    this.abortController = new AbortController();

    const initialContent = message.content;
    const initialRoundtrips = message.roundtrips;
    const updateMessage = (m: Partial<ChatModelRunResult>) => {
      message = {
        ...message,
        ...(m.content
          ? { content: [...initialContent, ...(m.content ?? [])] }
          : undefined),
        status: m.status ?? message.status,
        ...(m.roundtrips?.length
          ? { roundtrips: [...(initialRoundtrips ?? []), ...m.roundtrips] }
          : undefined),
      };
      this.repository.addOrUpdateMessage(parentId, message);
      this.notifySubscribers();
    };

    const maxToolRoundtrips = this.options?.maxToolRoundtrips ?? 1;
    const toolRoundtrips = message.roundtrips?.length ?? 0;
    if (toolRoundtrips > maxToolRoundtrips) {
      // reached max tool roundtrips
      updateMessage({
        status: {
          type: "incomplete",
          reason: "tool-calls",
        },
      });
      return message;
    } else {
      updateMessage({
        status: {
          type: "running",
        },
      });
    }

    try {
      const result = await this.adapter.run({
        messages,
        abortSignal: this.abortController.signal,
        config: this.configProvider.getModelConfig(),
        onUpdate: updateMessage,
      });
      if (result.status?.type === "running")
        throw new Error(
          "Unexpected running status returned from ChatModelAdapter",
        );

      this.abortController = null;
      updateMessage({
        status: { type: "complete", reason: "unknown" },
        ...result,
      });
    } catch (e) {
      this.abortController = null;

      // TODO this should be handled by the run result stream
      if (e instanceof Error && e.name === "AbortError") {
        updateMessage({
          status: { type: "incomplete", reason: "cancelled" },
        });
      } else {
        updateMessage({
          status: { type: "incomplete", reason: "error", error: e },
        });

        throw e;
      }
    }
    return message;
  }

  cancelRun(): void {
    if (!this.abortController) return;

    this.abortController.abort();
    this.abortController = null;
  }

  private notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  addToolResult({ messageId, toolCallId, result }: AddToolResultOptions) {
    let { parentId, message } = this.repository.getMessage(messageId);

    if (message.role !== "assistant")
      throw new Error("Tried to add tool result to non-assistant message");

    let added = false;
    let found = false;
    const newContent = message.content.map((c) => {
      if (c.type !== "tool-call") return c;
      if (c.toolCallId !== toolCallId) return c;
      found = true;
      if (!c.result) added = true;
      return {
        ...c,
        result,
      };
    });

    if (!found)
      throw new Error("Tried to add tool result to non-existing tool call");

    message = {
      ...message,
      content: newContent,
    };
    this.repository.addOrUpdateMessage(parentId, message);

    if (added && shouldContinue(message)) {
      this.performRoundtrip(parentId, message);
    }
  }
}
