export { resource } from "./core/resource";
export { withKey } from "./core/withKey";

// imperative
export { createTapRoot } from "./core/createTapRoot";
export { flushTapSync } from "./core/scheduler";

// context
export { useContextProvider } from "./core/context";

// hooks
export { useResource } from "./hooks/useResource";
export { useResources } from "./hooks/useResources";
export { useTapRoot } from "./hooks/useTapRoot";
export { useTapHost } from "./hooks/useTapHost";

// types
export type {
  Resource,
  ContravariantResource,
  ResourceElement,
} from "./core/types";
