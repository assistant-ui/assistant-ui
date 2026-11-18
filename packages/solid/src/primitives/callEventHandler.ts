import type { JSX } from "solid-js";

/**
 * Invokes a Solid event handler prop, either a plain function or a bound
 * `[handler, data]` tuple, so a primitive can run the caller's handler before
 * its own and honor `event.preventDefault()` as a veto.
 */
export const callEventHandler = <T, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element },
): void => {
  if (typeof handler === "function") {
    handler(event);
  } else if (handler) {
    handler[0](handler[1], event);
  }
};
