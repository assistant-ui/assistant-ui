export type {
  ClientMethods,
  ClientSchema,
  ScopeRegistry,
  ClientOutput,
  ClientNames,
  ClientEvents,
  ClientMeta,
  ClientElement,
  Unsubscribe,
  AssistantState,
  AssistantClientAccessor,
  AssistantClient,
} from "./client";

export {
  normalizeEventSelector,
  type AssistantEventPayload,
  type AssistantEventName,
  type AssistantEventScope,
  type AssistantEventSelector,
  type AssistantEventCallback,
} from "./events";
