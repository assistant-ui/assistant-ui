export { resource } from "./core/resource";
export { withKey } from "./core/withKey";

// imperative
export { createTapRoot } from "./core/createTapRoot";
export { flushTapSync } from "./core/scheduler";

// context
export { useContextProvider } from "./core/context";

// hooks
export { useMemoCache } from "./react-hooks/useMemoCache";
export { useResource } from "./hooks/useResource";
export { useResources } from "./hooks/useResources";
export { useTapRoot } from "./hooks/useTapRoot";
export { useTapHost } from "./hooks/useTapHost";

// types
export type { Resource, ResourceElement } from "./core/types";
