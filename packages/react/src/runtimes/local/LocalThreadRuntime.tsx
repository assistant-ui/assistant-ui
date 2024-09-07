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
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../utils/MessageRepository";
import type { ChatModelAdapter, ChatModelRunResult } from "./ChatModelAdapter";
import { ThreadRuntimeComposer } from "../utils/ThreadRuntimeComposer";
import { shouldContinue } from "./shouldContinue";
import { LocalRuntimeOptions } from "./LocalRuntimeOptions";
import { ThreadRuntime } from "../core";
import { SpeechSynthesisAdapter } from "../speech";

export class LocalThreadRuntime implements ThreadRuntime {
  private _subscriptions = new Set<() => void>();

  private abortController: AbortController | null = null;
  private readonly repository = new MessageRepository();

  public readonly capabilities = {
    switchToBranch: true,
    edit: true,
    reload: true,
    cancel: true,
    unstable_copy: true,
    speak: false,
    attachments: false,
  };

  public readonly threadId: string;
  public readonly isDisabled = false;

  public get messages() {
    return this.repository.getMessages();
  }

  public readonly composer = new ThreadRuntimeComposer(
    this.notifySubscribers.bind(this),
  );

  constructor(
    private configProvider: ModelConfigProvider,
    public adapter: ChatModelAdapter,
    { initialMessages, ...options }: LocalRuntimeOptions,
  ) {
    this.threadId = generateId();
    this.options = options;
    if (initialMessages) {
      let parentId: string | null = null;
      const messages = fromCoreMessages(initialMessages);
      for (const message of messages) {
        this.repository.addOrUpdateMessage(parentId, message);
        parentId = message.id;
      }
    }
  }

  private _options!: LocalRuntimeOptions;

  public get options() {
    return this._options;
  }

  public set options({ initialMessages, ...options }: LocalRuntimeOptions) {
    this._options = options;

    const canSpeak = options.adapters?.speech !== undefined;
    if (this.capabilities.speak !== canSpeak) {
      this.capabilities.speak = canSpeak;
      this.notifySubscribers();
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
    // TODO add support for assistant appends
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
      attachments: message.attachments ?? [],
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
    const initialRoundtrips = message.metadata?.roundtrips;
    const initalCustom = message.metadata?.custom;
    const updateMessage = (m: Partial<ChatModelRunResult>) => {
      message = {
        ...message,
        ...(m.content
          ? { content: [...initialContent, ...(m.content ?? [])] }
          : undefined),
        status: m.status ?? message.status,
        // TODO deprecated, remove in v0.6
        ...(m.metadata?.roundtrips
          ? {
              roundtrips: [
                ...(initialRoundtrips ?? []),
                ...m.metadata.roundtrips,
              ],
            }
          : undefined),
        ...(m.metadata
          ? {
              metadata: {
                ...message.metadata,
                ...(m.metadata.roundtrips
                  ? {
                      roundtrips: [
                        ...(initialRoundtrips ?? []),
                        ...m.metadata.roundtrips,
                      ],
                    }
                  : undefined),
                ...(m.metadata?.custom
                  ? {
                      custom: { ...(initalCustom ?? {}), ...m.metadata.custom },
                    }
                  : undefined),
              },
            }
          : undefined),
      };
      this.repository.addOrUpdateMessage(parentId, message);
      this.notifySubscribers();
    };

    const maxToolRoundtrips = this.options.maxToolRoundtrips ?? 1;
    const toolRoundtrips = message.metadata?.roundtrips?.length ?? 0;
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

  public addToolResult({
    messageId,
    toolCallId,
    result,
  }: AddToolResultOptions) {
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

  // TODO lift utterance state to thread runtime
  private _utterance: SpeechSynthesisAdapter.Utterance | undefined;

  public speak(messageId: string) {
    const adapter = this.options.adapters?.speech;
    if (!adapter) throw new Error("Speech adapter not configured");

    const { message } = this.repository.getMessage(messageId);

    if (this._utterance) {
      this._utterance.cancel();
      this._utterance = undefined;
    }

    const utterance = adapter.speak(message);
    utterance.onEnd(() => {
      if (this._utterance === utterance) {
        this._utterance = undefined;
      }
    });
    this._utterance = utterance;

    return this._utterance;
  }

  public export() {
    return this.repository.export();
  }

  public import(data: ExportedMessageRepository) {
    this.repository.import(data);
    this.notifySubscribers();
  }
}
