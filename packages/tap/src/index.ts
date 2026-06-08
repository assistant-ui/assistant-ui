export { resource } from "./core/resource";
export { withKey } from "./core/withKey";

// imperative
export { createResourceRoot } from "./core/createResourceRoot";
export { flushResourcesSync } from "./core/scheduler";

// context
export { createResourceContext, withContextProvider } from "./core/context";

// hooks
export { useResource, useResources, useResourceRoot } from "./react/hooks";

// types
export type {
  Resource,
  ContravariantResource,
  ResourceElement,
} from "./core/types";
