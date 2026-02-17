export {
  BaseProxyHandler,
  handleIntrospectionProp,
} from "./BaseProxyHandler";
export {
  SYMBOL_CLIENT_INDEX,
  getClientIndex,
  type ClientStack,
  tapClientStack,
  tapWithClientStack,
} from "./tap-client-stack-context";
export {
  type AssistantTapContextValue,
  withAssistantTapContextProvider,
  tapAssistantClientRef,
  tapAssistantEmit,
} from "./tap-assistant-context";
export { NotificationManager } from "./NotificationManager";
export {
  PROXIED_ASSISTANT_STATE_SYMBOL,
  createProxiedAssistantState,
  getProxiedAssistantState,
} from "./proxied-assistant-state";
export {
  type RootClients,
  type DerivedClients,
  tapSplitClients,
} from "./splitClients";
