import type { UIMessage } from "ai";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { CloudMessage } from "../AssistantCloudThreadMessages";

/**
 * Storage format for AI SDK v6 messages - UIMessage without the id field.
 * The id is stored separately in CloudMessage.id.
 */
export type AISDKStorageFormat = Omit<UIMessage, "id">;

export const MESSAGE_FORMAT = "ai-sdk/v6";

/**
 * Encode a UIMessage for cloud storage.
 * Strips the id (stored separately) and filters out file parts (not yet supported).
 */
export function encode({ id, parts, ...rest }: UIMessage): ReadonlyJSONObject {
  return {
    ...rest,
    parts: parts?.filter((part) => part.type !== "file"),
  } as ReadonlyJSONObject;
}

/**
 * Decode a CloudMessage back to UIMessage format.
 */
export function decode(stored: CloudMessage): UIMessage {
  const content = stored.content as AISDKStorageFormat;
  return {
    id: stored.id,
    ...content,
  };
}
