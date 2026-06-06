import { isResourceContext, useResourceContext } from "../core/context";

/**
 * Reads a resource context from inside a resource render, the tap equivalent of
 * React's `use(Context)`. Only resource contexts are supported.
 */
export const use = (usable: unknown): unknown => {
  if (isResourceContext(usable)) return useResourceContext(usable as never);
  throw new Error("A tap resource's `use()` only accepts a resource context.");
};
