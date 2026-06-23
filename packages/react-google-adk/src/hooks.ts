import { useAui } from "@assistant-ui/store";
import { v4 as uuidv4 } from "uuid";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { adkExtras } from "./adkExtras";
import type {
  AdkMessage,
  AdkSendMessageConfig,
  AdkToolConfirmation,
  AdkAuthCredential,
  AdkAuthRequest,
  AdkMessageMetadata,
} from "./types";

const EMPTY_STATE_DELTA: Record<string, unknown> = {};
const EMPTY_ARTIFACT_DELTA: Record<string, number> = {};
const EMPTY_LONG_RUNNING_TOOL_IDS: string[] = [];
const EMPTY_TOOL_CONFIRMATIONS: AdkToolConfirmation[] = [];
const EMPTY_AUTH_REQUESTS: AdkAuthRequest[] = [];
const EMPTY_MESSAGE_METADATA = new Map<string, AdkMessageMetadata>();

/** Returns the name and branch of the currently active ADK agent. */
export const useAdkAgentInfo = () =>
  adkExtras.use((e) => e.agentInfo, undefined);

/** Returns the accumulated session state delta from ADK events. */
export const useAdkSessionState = () =>
  adkExtras.use((e) => e.stateDelta, EMPTY_STATE_DELTA);

/** Returns a function to send raw ADK messages. */
export const useAdkSend = () => {
  const aui = useAui();
  return (messages: AdkMessage[], config: AdkSendMessageConfig) =>
    adkExtras.get(aui).send(messages, config);
};

/** Returns the IDs of long-running tools awaiting external input. */
export const useAdkLongRunningToolIds = () =>
  adkExtras.use((e) => e.longRunningToolIds, EMPTY_LONG_RUNNING_TOOL_IDS);

/** Returns pending tool confirmation requests (from SecurityPlugin etc). */
export const useAdkToolConfirmations = () =>
  adkExtras.use((e) => e.toolConfirmations, EMPTY_TOOL_CONFIRMATIONS);

/** Returns pending auth credential requests from tools. */
export const useAdkAuthRequests = () =>
  adkExtras.use((e) => e.authRequests, EMPTY_AUTH_REQUESTS);

/** Returns the accumulated artifact delta (filename → version). */
export const useAdkArtifacts = () =>
  adkExtras.use((e) => e.artifactDelta, EMPTY_ARTIFACT_DELTA);

/** Returns whether any agent has escalated (requested human handoff). */
export const useAdkEscalation = () => adkExtras.use((e) => e.escalated, false);

/** Returns per-message metadata (grounding, citation, usage). Keyed by message ID. */
export const useAdkMessageMetadata = () =>
  adkExtras.use((e) => e.messageMetadata, EMPTY_MESSAGE_METADATA);

// ── Convenience helpers for interactive flows ──

/** Returns a function to confirm or deny a pending tool confirmation. */
export const useAdkConfirmTool = () => {
  const aui = useAui();
  return (
    toolCallId: string,
    confirmed: boolean,
    payload?: ReadonlyJSONValue,
  ) =>
    adkExtras.get(aui).send(
      [
        {
          id: uuidv4(),
          type: "tool",
          tool_call_id: toolCallId,
          name: "adk_request_confirmation",
          content: JSON.stringify({
            confirmed,
            ...(payload != null && { payload }),
          }),
          status: "success",
        },
      ],
      {},
    );
};

/** Returns a function to submit auth credentials for a pending auth request. */
export const useAdkSubmitAuth = () => {
  const aui = useAui();
  return (toolCallId: string, credential: AdkAuthCredential) =>
    adkExtras.get(aui).send(
      [
        {
          id: uuidv4(),
          type: "tool",
          tool_call_id: toolCallId,
          name: "adk_request_credential",
          content: JSON.stringify(credential),
          status: "success",
        },
      ],
      {},
    );
};

/** Returns a function to submit the user's answer for a pending `adk_request_input` HITL interrupt. */
export const useAdkSubmitInput = () => {
  const aui = useAui();
  return (toolCallId: string, result: ReadonlyJSONValue) =>
    adkExtras.get(aui).send(
      [
        {
          id: uuidv4(),
          type: "tool",
          tool_call_id: toolCallId,
          name: "adk_request_input",
          content: JSON.stringify({ result }),
          status: "success",
        },
      ],
      {},
    );
};

// ── State prefix helpers ──

const APP_PREFIX = "app:";
const USER_PREFIX = "user:";
const TEMP_PREFIX = "temp:";

const filterByPrefix = (
  state: Record<string, unknown>,
  prefix: string,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = state[key];
    }
  }
  return result;
};

/** Returns app-level state (keys prefixed with `app:`, prefix stripped). */
export const useAdkAppState = () =>
  adkExtras.use(
    (e) => filterByPrefix(e.stateDelta, APP_PREFIX),
    EMPTY_STATE_DELTA,
  );

/** Returns user-level state (keys prefixed with `user:`, prefix stripped). */
export const useAdkUserState = () =>
  adkExtras.use(
    (e) => filterByPrefix(e.stateDelta, USER_PREFIX),
    EMPTY_STATE_DELTA,
  );

/** Returns temp state (keys prefixed with `temp:`, prefix stripped). Not persisted. */
export const useAdkTempState = () =>
  adkExtras.use(
    (e) => filterByPrefix(e.stateDelta, TEMP_PREFIX),
    EMPTY_STATE_DELTA,
  );
