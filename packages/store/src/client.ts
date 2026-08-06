// Framework-neutral entry: no module evaluates a React component API, so this
// graph loads with react installed, or with react aliased to
// @assistant-ui/tap/standalone-shim, or (types aside) not at all.

export {
  createAssistantClient,
  type AssistantClientHandle,
  type AssistantClientSource,
} from "./createAssistantClient";

export { DefaultAssistantClient } from "./utils/react-assistant-context";
export { getProxiedAssistantState } from "./utils/proxied-assistant-state";
export { useAssistantEmit } from "./utils/tap-assistant-context";
export { useClientResource } from "./useClientResource";

export { AuiConfig } from "./AuiConfig";
export { Derived, type DerivedElement } from "./Derived";

export {
  normalizeEventSelector,
  type AssistantEventName,
  type AssistantEventCallback,
  type AssistantEventSelector,
  type AssistantEventPayload,
} from "./types/events";

export type {
  AssistantClient,
  AssistantState,
  Unsubscribe,
} from "./types/client";
