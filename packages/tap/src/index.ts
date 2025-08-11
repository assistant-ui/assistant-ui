export { resource } from "./core/resource";

// primitive hooks
export { tapState } from "./hooks/tap-state";
export { tapEffect } from "./hooks/tap-effect";

// utility hooks
export { tapRef } from "./hooks/tap-ref";
export { tapMemo } from "./hooks/tap-memo";
export { tapCallback } from "./hooks/tap-callback";

// resources
export { tapResource } from "./hooks/tap-resource";
export { tapInlineResource } from "./hooks/tap-inline-resource";
// export { tapResources } from "./hooks/tap-resources";

// imperative
export { createResource, type ResourceHandle } from "./core/ResourceHandle";

export type {
  ResourceFn,
  ResourceElement,
  ResourceElementConstructor,
  Unsubscribe,
  StateUpdater,
  EffectCallback,
  Destructor,
} from "./core/types";
