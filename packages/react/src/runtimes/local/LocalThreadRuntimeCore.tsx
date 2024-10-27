import { generateId } from "../../internal";
import type {
  ModelConfigProvider,
  AppendMessage,
  ThreadAssistantMessage,
} from "../../types";
import { fromCoreMessage } from "../edge";
import type { ChatModelRunResult } from "./ChatModelAdapter";
import { shouldContinue } from "./shouldContinue";
import { LocalRuntimeOptionsBase } from "./LocalRuntimeOptions";
import {
  AddToolResultOptions,
  ThreadSuggestion,
  ThreadRuntimeCore,
} from "../core/ThreadRuntimeCore";
import { BaseThreadRuntimeCore } from "../core/BaseThreadRuntimeCore";

export class LocalThreadRuntimeCore
  extends BaseThreadRuntimeCore
  implements ThreadRuntimeCore
{
  public readonly capabilities = {
    switchToBranch: true,
    edit: true,
    reload: true,
    cancel: true,
    unstable_copy: true,
    speech: false,
    attachments: false,
    feedback: false,
  };

  private abortController: AbortController | null = null;

  public readonly isDisabled = false;
  public readonly suggestions: readonly ThreadSuggestion[] = [];

  public get adapters() {
    return this._options.adapters;
  }

  constructor(
    configProvider: ModelConfigProvider,
    public readonly threadId: string,
    options: LocalRuntimeOptionsBase,
  ) {
    super(configProvider);

    this.setOptions(options);
  }

  private _options!: LocalRuntimeOptionsBase;

  public get extras() {
    return undefined;
  }

  public setOptions(options: LocalRuntimeOptionsBase) {
    if (this._options === options) return;

    this._options = options;

    let hasUpdates = false;

    const canSpeak = options.adapters?.speech !== undefined;
    if (this.capabilities.speech !== canSpeak) {
      this.capabilities.speech = canSpeak;
      hasUpdates = true;
    }

    const canAttach = options.adapters?.attachments !== undefined;
    if (this.capabilities.attachments !== canAttach) {
      this.capabilities.attachments = canAttach;
      hasUpdates = true;
    }

    const canFeedback = options.adapters?.feedback !== undefined;
    if (this.capabilities.feedback !== canFeedback) {
      this.capabilities.feedback = canFeedback;
      hasUpdates = true;
    }

    if (hasUpdates) this._notifySubscribers();
  }

  public async append(message: AppendMessage): Promise<void> {
    const newMessage = fromCoreMessage(message, {
      attachments: message.attachments,
    });
    this.repository.addOrUpdateMessage(message.parentId, newMessage);

    const startRun = message.startRun ?? message.role === "user";
    if (startRun) {
      await this.startRun(newMessage.id);
    } else {
      this.repository.resetHead(newMessage.id);
      this._notifySubscribers();
    }
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

    this._notifyEventSubscribers("run-start");

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
    const initialSteps = message.metadata?.steps;
    const initalCustom = message.metadata?.custom;
    const updateMessage = (m: Partial<ChatModelRunResult>) => {
      const newSteps = m.metadata?.steps || m.metadata?.roundtrips;
      const steps = newSteps
        ? [...(initialSteps ?? []), ...newSteps]
        : undefined;

      message = {
        ...message,
        ...(m.content
          ? { content: [...initialContent, ...(m.content ?? [])] }
          : undefined),
        status: m.status ?? message.status,
        // TODO deprecated, remove in v0.6
        ...(steps ? { roundtrips: steps } : undefined),
        ...(m.metadata
          ? {
              metadata: {
                ...message.metadata,
                ...(steps ? { roundtrips: steps, steps } : undefined),
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
      this._notifySubscribers();
    };

    const maxSteps = this._options.maxSteps
      ? this._options.maxSteps
      : (this._options.maxToolRoundtrips ?? 1) + 1;

    const steps = message.metadata?.steps?.length ?? 0;
    if (steps >= maxSteps) {
      // reached max tool steps
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
      const promiseOrGenerator = this.adapters.chatModel.run({
        messages,
        abortSignal: this.abortController.signal,
        config: this.getModelConfig(),
        onUpdate: updateMessage,
        unstable_assistantMessageId: message.id,
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

  public cancelRun() {
    this.abortController?.abort();
    this.abortController = null;
  }

  public addToolResult({
    messageId,
    toolCallId,
    result,
  }: AddToolResultOptions) {
    const messageData = this.repository.getMessage(messageId);
    const { parentId } = messageData;
    let { message } = messageData;

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
