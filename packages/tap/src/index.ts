export { resource } from "./core/resource";
export { withKey } from "./core/withKey";

// imperative
export { createTapRoot } from "./core/createTapRoot";
export { flushTapSync } from "./core/scheduler";

// context
export { useContextProvider } from "./core/context";

// hooks
import { useMemoCache as useMemoCacheInternal } from "./react-hooks/useMemoCache";
/**
 * @deprecated Internal API kept for older @assistant-ui/store versions; do not use.
 */
export const useMemoCache = useMemoCacheInternal;
export { useResource } from "./hooks/useResource";
export { useResources } from "./hooks/useResources";
export { useTapRoot } from "./hooks/useTapRoot";
export { useTapHost } from "./hooks/useTapHost";

// types
export type { Resource, ResourceElement } from "./core/types";
