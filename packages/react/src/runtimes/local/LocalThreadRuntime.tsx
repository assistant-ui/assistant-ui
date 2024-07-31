import { ThreadRuntime } from "..";
import { AddToolResultOptions } from "../../context";
import { generateId } from "../../internal";
import type {
  ModelConfigProvider,
  AppendMessage,
  ThreadUserMessage,
  ThreadAssistantMessage,
  Unsubscribe,
} from "../../types";
import { fromCoreMessages } from "../edge";
import { ExportedMessageRepository, MessageRepository } from "../utils/MessageRepository";
import type { ChatModelAdapter, ChatModelRunResult } from "./ChatModelAdapter";
import { shouldContinue } from "./shouldContinue";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";

const CAPABILITIES = Object.freeze({
  switchToBranch: true,
  edit: true,
  reload: true,
  cancel: true,
  copy: true,
});
export class LocalThreadRuntime implements ThreadRuntime {
  private _subscriptions = new Set<() => void>();

  private abortController: AbortController | null = null;
  private readonly repository = new MessageRepository();

  public readonly capabilities = CAPABILITIES;

  public readonly isDisabled = false;

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
      content: [],
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
      const promiseOrGenerator = this.adapter.run({
        messages,
        abortSignal: this.abortController.signal,
        config: this.configProvider.getModelConfig(),
        onUpdate: updateMessage,
      });

      // handle async iterator for streaming results
      if (Symbol.asyncIterator in promiseOrGenerator) {
        for await (const r of promiseOrGenerator) {
          updateMessage(r);
        }
      } else {
        updateMessage(await promiseOrGenerator);
      }

      this.abortController = null;

      if (message.status.type === "running") {
        updateMessage({
          status: { type: "complete", reason: "unknown" },
        });
      } else {
        // notify subscribers that isRunning is now false
        this.notifySubscribers();
      }
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

  export() {
    return this.repository.export();
  }

  import(data: ExportedMessageRepository) {
    this.repository.import(data);
    this.notifySubscribers()
  }
}
