export { resource } from "./core/resource";
export { withKey } from "./core/withKey";

// primitive hooks
export { tapState } from "./hooks/tap-state";
export { tapReducer, tapReducerWithDerivedState } from "./hooks/tap-reducer";
export { tapEffect } from "./hooks/tap-effect";

// utility hooks
export { tapRef } from "./hooks/tap-ref";
export { tapConst } from "./hooks/tap-const";
export { tapMemo } from "./hooks/tap-memo";
export { tapCallback } from "./hooks/tap-callback";
export { tapEffectEvent } from "./hooks/tap-effect-event";

// resources
export { tapResource } from "./hooks/tap-resource";
export { tapResources } from "./hooks/tap-resources";

// subscribable
export { tapResourceRoot } from "./tapResourceRoot";

// imperative
export { createResourceRoot } from "./core/createResourceRoot";
export { flushResourcesSync } from "./core/scheduler";

// context
export {
  createResourceContext,
  tap,
  withContextProvider,
} from "./core/context";

// types
export type {
  Resource,
  ContravariantResource,
  ResourceElement,
} from "./core/types";
