import { generateId } from "../../internal";
import type { AppendMessage, ThreadAssistantMessage } from "../../types";
import { fromCoreMessage } from "../edge";
import type { ChatModelRunResult } from "./ChatModelAdapter";
import { shouldContinue } from "./shouldContinue";
import { LocalRuntimeOptionsBase } from "./LocalRuntimeOptions";
import {
  AddToolResultOptions,
  ThreadSuggestion,
  ThreadRuntimeCore,
  StartRunConfig,
} from "../core/ThreadRuntimeCore";
import { BaseThreadRuntimeCore } from "../core/BaseThreadRuntimeCore";
import { RunConfig } from "../../types/AssistantTypes";
import { ModelContextProvider } from "../../model-context";

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
    contextProvider: ModelContextProvider,
    options: LocalRuntimeOptionsBase,
  ) {
    super(contextProvider);
    this.__internal_setOptions(options);
  }

  private _options!: LocalRuntimeOptionsBase;

  private _lastRunConfig: RunConfig = {};

  public get extras() {
    return undefined;
  }

  public __internal_setOptions(options: LocalRuntimeOptionsBase) {
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
    this.ensureInitialized();

    const newMessage = fromCoreMessage(message, {
      attachments: message.attachments,
    });
    this.repository.addOrUpdateMessage(message.parentId, newMessage);

    const startRun = message.startRun ?? message.role === "user";
    if (startRun) {
      await this.startRun({
        parentId: newMessage.id,
        sourceId: message.sourceId,
        runConfig: message.runConfig ?? {},
      });
    } else {
      this.repository.resetHead(newMessage.id);
      this._notifySubscribers();
    }
  }

  public async startRun({
    parentId,
    runConfig,
  }: StartRunConfig): Promise<void> {
    this.ensureInitialized();

    this.repository.resetHead(parentId);

    // add assistant message
    const id = generateId();
    let message: ThreadAssistantMessage = {
      id,
      role: "assistant",
      status: { type: "running" },
      content: [],
      metadata: { unstable_data: [], steps: [], custom: {} },
      createdAt: new Date(),
    };

    this._notifyEventSubscribers("run-start");

    try {
      do {
        message = await this.performRoundtrip(parentId, message, runConfig);
      } while (
        shouldContinue(
          message,
          this._options.unstable_shouldContinueIgnoreToolNames ?? [],
        )
      );
    } finally {
      this._notifyEventSubscribers("run-end");
    }
  }

  private async performRoundtrip(
    parentId: string | null,
    message: ThreadAssistantMessage,
    runConfig: RunConfig | undefined,
  ) {
    const messages = this.repository.getMessages();

    // abort existing run
    this.abortController?.abort();
    this.abortController = new AbortController();

    const initialContent = message.content;
    const initialData = message.metadata?.unstable_data;
    const initialSteps = message.metadata?.steps;
    const initalCustom = message.metadata?.custom;
    const updateMessage = (m: Partial<ChatModelRunResult>) => {
      const newSteps = m.metadata?.steps;
      const steps = newSteps
        ? [...(initialSteps ?? []), ...newSteps]
        : undefined;

      const newData = m.metadata?.unstable_data;
      const data = newData ? [...(initialData ?? []), ...newData] : undefined;

      message = {
        ...message,
        ...(m.content
          ? { content: [...initialContent, ...(m.content ?? [])] }
          : undefined),
        status: m.status ?? message.status,
        ...(m.metadata
          ? {
              metadata: {
                ...message.metadata,
                ...(data ? { unstable_data: data } : undefined),
                ...(steps ? { steps } : undefined),
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

    const maxSteps = this._options.maxSteps ?? 2;

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
      this._lastRunConfig = runConfig ?? {};
      const context = this.getModelContext();
      const promiseOrGenerator = this.adapters.chatModel.run({
        messages,
        runConfig: this._lastRunConfig,
        abortSignal: this.abortController.signal,
        context,
        config: context,
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

    if (
      added &&
      shouldContinue(
        message,
        this._options.unstable_shouldContinueIgnoreToolNames ?? [],
      )
    ) {
      this.performRoundtrip(parentId, message, this._lastRunConfig);
    }
  }
}
