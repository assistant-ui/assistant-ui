// Internal utilities — consumed by @assistant-ui/store, not public API.

export {
  BaseProxyHandler,
  handleIntrospectionProp,
} from "./utils/base-proxy-handler";
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
export { NotificationManager } from "./utils/notification-manager";
export {
  PROXIED_ASSISTANT_STATE_SYMBOL,
  createProxiedAssistantState,
  getProxiedAssistantState,
} from "./utils/proxied-assistant-state";
export {
  type RootClients,
  type DerivedClients,
  tapSplitClients,
} from "./utils/split-clients";
export { getClientState, ClientResource } from "./utils/tap-client-resource";
export { wrapperResource } from "./utils/wrapper-resource";
export { getTransformScopes } from "./utils/attach-transform-scopes";
export * from "./runtime-clients";
