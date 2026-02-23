// Internal utilities — consumed by @assistant-ui/core, not public API.

export {
  BaseProxyHandler,
  handleIntrospectionProp,
} from "./utils/BaseProxyHandler";
export {
  SYMBOL_CLIENT_INDEX,
  getClientIndex,
  type ClientStack,
  tapClientStack,
  tapWithClientStack,
} from "./utils/tap-client-stack-context";
export {
  type AssistantTapContextValue,
  withAssistantTapContextProvider,
} from "./utils/tap-assistant-context";
export { NotificationManager } from "./utils/NotificationManager";
export {
  PROXIED_ASSISTANT_STATE_SYMBOL,
  createProxiedAssistantState,
  getProxiedAssistantState,
} from "./utils/proxied-assistant-state";
export {
  type RootClients,
  type DerivedClients,
  tapSplitClients,
} from "./utils/splitClients";
export { getClientState, ClientResource } from "./tapClientResource";
export { wrapperResource } from "./wrapperResource";
export { getTransformScopes } from "./attachTransformScopes";
