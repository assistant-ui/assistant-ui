import type { ScopeRegistry as StoreScopeRegistry } from "./scope-registry";

// Forward user augmentations on @assistant-ui/store to @assistant-ui/core/store
declare module "@assistant-ui/core/store" {
  interface ScopeRegistry extends StoreScopeRegistry {}
}
