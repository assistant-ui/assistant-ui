// Re-export from @assistant-ui/core
export type { ThreadMessageLike } from "@assistant-ui/core";
export {
  getExternalStoreMessage,
  getExternalStoreMessages,
} from "@assistant-ui/core";

// React-specific (stay in react)
export type {
  ExternalStoreAdapter,
  ExternalStoreMessageConverter,
  ExternalStoreThreadListAdapter,
  ExternalStoreThreadData,
} from "./ExternalStoreAdapter";
export { useExternalStoreRuntime } from "./useExternalStoreRuntime";
export {
  useExternalMessageConverter,
  convertExternalMessages as unstable_convertExternalMessages,
} from "./external-message-converter";
export { createMessageConverter as unstable_createMessageConverter } from "./createMessageConverter";
