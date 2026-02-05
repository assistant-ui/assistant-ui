import type { UIMessage } from "@ai-sdk/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

export const MESSAGE_FORMAT = "ai-sdk/v6";

/**
 * Encode a UIMessage for cloud storage.
 * Strips the id (stored separately in CloudMessage.id).
 */
export function encode({ id, ...rest }: UIMessage): ReadonlyJSONObject {
  return rest as ReadonlyJSONObject;
}
