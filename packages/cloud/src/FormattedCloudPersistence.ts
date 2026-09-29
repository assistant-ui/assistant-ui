import type { ReadonlyJSONObject } from "assistant-stream/utils";

/**
 * Format adapter shape — structurally identical to the MessageFormatAdapter
 * in @assistant-ui/react, but defined here to avoid cross-package type moves.
 * TypeScript's structural typing ensures these are interchangeable.
 */
export type MessageFormatAdapter<TMessage, TStorageFormat> = {
  format: string;
  encode(item: { parentId: string | null; message: TMessage }): TStorageFormat;
  decode(stored: {
    id: string;
    parent_id: string | null;
    format: string;
    content: TStorageFormat;
  }): { parentId: string | null; message: TMessage };
  getId(message: TMessage): string;
};

/**
 * Wraps a CloudMessagePersistence with a MessageFormatAdapter's encode and
 * decode. The persistence parameter is typed structurally, so a caller does
 * not need to import the class.
 */
export const createFormattedPersistence = <TMessage, TStorageFormat>(
  persistence: {
    append: (
      threadId: string,
      messageId: string,
      parentId: string | null,
      format: string,
      content: ReadonlyJSONObject,
    ) => Promise<void>;
    load: (threadId: string, format?: string) => Promise<any[]>;
    isPersisted: (messageId: string) => boolean;
    update?: (
      threadId: string,
      messageId: string,
      format: string,
      content: ReadonlyJSONObject,
    ) => Promise<void>;
  },
  adapter: MessageFormatAdapter<TMessage, TStorageFormat>,
) => ({
  append: async (
    threadId: string,
    item: { parentId: string | null; message: TMessage },
  ): Promise<void> => {
    const messageId = adapter.getId(item.message);
    const encoded = adapter.encode(item);
    return persistence.append(
      threadId,
      messageId,
      item.parentId,
      adapter.format,
      encoded as ReadonlyJSONObject,
    );
  },
  update: persistence.update
    ? async (
        threadId: string,
        item: { parentId: string | null; message: TMessage },
        messageId: string,
      ): Promise<void> => {
        const encoded = adapter.encode(item);
        return persistence.update!(
          threadId,
          messageId,
          adapter.format,
          encoded as ReadonlyJSONObject,
        );
      }
    : undefined,
  load: async (threadId: string) => {
    const messages = await persistence.load(threadId, adapter.format);
    return {
      messages: messages
        .filter((m) => m.format === adapter.format)
        .map((m) =>
          adapter.decode({
            id: m.id,
            parent_id: m.parent_id,
            format: m.format,
            content: m.content as TStorageFormat,
          }),
        )
        .reverse(),
    };
  },
  isPersisted: (messageId: string) => persistence.isPersisted(messageId),
});
