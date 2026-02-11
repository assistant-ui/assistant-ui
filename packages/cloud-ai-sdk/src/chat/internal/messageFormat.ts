import type { UIMessage } from "@ai-sdk/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

export const MESSAGE_FORMAT = "ai-sdk/v6";

export function encode({ id, ...rest }: UIMessage): ReadonlyJSONObject {
  return rest as ReadonlyJSONObject;
}
