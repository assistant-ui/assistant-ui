import type { UIMessage } from "@ai-sdk/react";
import {
  CloudMessagePersistence,
  createFormattedPersistence,
} from "assistant-cloud";
import type { AssistantCloud } from "assistant-cloud";
import {
  aiSDKV6FormatAdapter,
  type AISDKStorageFormat,
} from "assistant-cloud/ai-sdk";

export const MESSAGE_FORMAT = aiSDKV6FormatAdapter.format;

type FormattedPersistence = ReturnType<
  typeof createFormattedPersistence<UIMessage, AISDKStorageFormat>
>;

export class MessagePersistence {
  private persistenceByThread = new Map<string, CloudMessagePersistence>();
  private formattedByThread = new Map<string, FormattedPersistence>();

  private cloud: AssistantCloud;
  private onError: (err: unknown) => void;

  constructor(cloud: AssistantCloud, onError: (err: unknown) => void) {
    this.cloud = cloud;
    this.onError = onError;
  }

  private getPersistence(threadId: string): CloudMessagePersistence {
    const existing = this.persistenceByThread.get(threadId);
    if (existing) return existing;

    const created = new CloudMessagePersistence(this.cloud);
    this.persistenceByThread.set(threadId, created);
    return created;
  }

  getFormattedPersistence(threadId: string): FormattedPersistence {
    const existing = this.formattedByThread.get(threadId);
    if (existing) return existing;

    const created = createFormattedPersistence(
      this.getPersistence(threadId),
      aiSDKV6FormatAdapter,
    );
    this.formattedByThread.set(threadId, created);
    return created;
  }

  getResolvedRemoteId(threadId: string, messageId: string): string | undefined {
    return this.getPersistence(threadId).getResolvedRemoteId(messageId);
  }

  getRemoteId(
    threadId: string,
    messageId: string,
  ): Promise<string | undefined> {
    return this.getPersistence(threadId).getRemoteId(messageId);
  }

  async persist(
    threadId: string,
    messages: UIMessage[],
    mountedRef: { current: boolean },
    options?: {
      roles?: UIMessage["role"][];
      strict?: boolean;
    },
  ): Promise<void> {
    const formatted = this.getFormattedPersistence(threadId);
    const roles = options?.roles;
    const strict = options?.strict ?? false;

    const appendTasks = messages.map((msg, idx) => {
      if (roles && !roles.includes(msg.role)) return null;
      if (formatted.isPersisted(msg.id)) return null;

      const parentId = idx > 0 ? messages[idx - 1]!.id : null;

      return formatted
        .append(threadId, { parentId, message: msg })
        .catch((err) => {
          if (mountedRef.current) {
            this.onError(err);
          }
          if (strict) {
            throw err;
          }
        });
    });

    const pending = appendTasks.filter(
      (task): task is Promise<void> => task !== null,
    );
    if (pending.length > 0) {
      await Promise.all(pending);
    }
  }

  async loadMessages(threadId: string): Promise<UIMessage[]> {
    const formatted = this.getFormattedPersistence(threadId);
    const { messages } = await formatted.load(threadId);
    return messages.map((item) => item.message);
  }
}
