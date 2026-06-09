export { resource } from "./core/resource";
export { withKey } from "./core/withKey";

// imperative
export { createTapRoot } from "./core/createTapRoot";
export { flushTapSync } from "./core/scheduler";

// context
export { createResourceContext, withContextProvider } from "./core/context";

// hooks
export { useResource, useResources, useTapRoot } from "./react/hooks";

// types
export type {
  Resource,
  ContravariantResource,
  ResourceElement,
} from "./core/types";
