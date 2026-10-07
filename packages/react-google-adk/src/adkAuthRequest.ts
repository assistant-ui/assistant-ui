import { generateId } from "@assistant-ui/core";
import { isRecord } from "@assistant-ui/core/internal";
import type { AdkAuthCredential, AdkAuthRequest, AdkMessage } from "./types";

export const ADK_REQUEST_CREDENTIAL = "adk_request_credential";

const recordOf = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {};

/**
 * ADK binds a credential reply to the `adk_request_credential` call it issued
 * and takes only `exchangedAuthCredential` off the response, so the reply is
 * the request's own auth config with the credential filled in, as ADK's
 * reference client sends it: adk-python validates the response as a whole auth
 * config, and it exchanges an OAuth2 code with the client id, redirect uri and
 * state the request carried, so the caller's fields land over the request's
 * exchanged credential rather than replacing it. An id that is not a pending
 * request would send a reply adk-js ignores and adk-python answers by
 * requesting again, so it throws instead.
 */
export const toAdkAuthReply = (
  toolCallId: string,
  credential: AdkAuthCredential,
  requests: readonly AdkAuthRequest[],
): AdkMessage & { type: "tool" } => {
  const request = requests.find((r) => r.toolCallId === toolCallId);
  if (request === undefined)
    throw new Error(
      `No pending ADK auth request for tool call id "${toolCallId}"`,
    );

  const authConfig = recordOf(request.authConfig);
  const requested = recordOf(authConfig.exchangedAuthCredential);
  const oauth2 = { ...recordOf(requested.oauth2), ...credential.oauth2 };
  return {
    id: generateId(),
    type: "tool",
    tool_call_id: toolCallId,
    name: ADK_REQUEST_CREDENTIAL,
    content: JSON.stringify({
      ...authConfig,
      exchangedAuthCredential: {
        ...requested,
        ...credential,
        ...(Object.keys(oauth2).length > 0 && { oauth2 }),
      },
    }),
    status: "success",
  };
};
