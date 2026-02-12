import type { UIMessage } from "@ai-sdk/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import {
  CloudMessagePersistence,
  createFormattedPersistence,
  type MessageFormatAdapter,
} from "assistant-cloud";
import type { AssistantCloud } from "assistant-cloud";

export const MESSAGE_FORMAT = "ai-sdk/v6";

function encode({ id, ...rest }: UIMessage): ReadonlyJSONObject {
  return rest as ReadonlyJSONObject;
}

// Intentionally duplicated in cloud-ai-sdk and react-ai-sdk.
// We keep this local to avoid introducing cross-package coupling for a small adapter.
// If behavior changes, update both adapters and their contract tests together.
const aiSdkFormatAdapter: MessageFormatAdapter<UIMessage, ReadonlyJSONObject> =
  {
    format: MESSAGE_FORMAT,
    encode: ({ message }) => encode(message),
    decode: (stored) => ({
      parentId: stored.parent_id,
      message: { id: stored.id, ...stored.content } as UIMessage,
    }),
    getId: (message) => message.id,
  };

type FormattedPersistence = ReturnType<
  typeof createFormattedPersistence<UIMessage, ReadonlyJSONObject>
>;

export class MessagePersistence {
  private persistenceByThread = new Map<string, CloudMessagePersistence>();
  private formattedByThread = new Map<string, FormattedPersistence>();

  constructor(
    private cloud: AssistantCloud,
    private onError: (err: unknown) => void,
  ) {}

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
      aiSdkFormatAdapter,
    );
    this.formattedByThread.set(threadId, created);
    return created;
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
