export { resource } from "./core/resource";

// primitive hooks
export { tapState } from "./hooks/tap-state";
export { tapEffect } from "./hooks/tap-effect";

// utility hooks
export { tapRef } from "./hooks/tap-ref";
export { tapMemo } from "./hooks/tap-memo";
export { tapCallback } from "./hooks/tap-callback";
export { tapEffectEvent } from "./hooks/tap-effect-event";

// resources
export { tapResource } from "./hooks/tap-resource";
export { tapInlineResource } from "./hooks/tap-inline-resource";
export { tapResources } from "./hooks/tap-resources";

// imperative
export { createResource } from "./core/createResource";
export { flushSync } from "./core/scheduler";

// context
export { createContext, tapContext, withContextProvider } from "./core/context";

// types
export type {
  Resource,
  ContravariantResource,
  ResourceElement,
  ExtractResourceOutput,
} from "./core/types";
