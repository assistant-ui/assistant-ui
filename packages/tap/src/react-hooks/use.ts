import { useContext } from "../core/context";
import { isThenable, trackThenable } from "../core/helpers/thenable";

/**
 * The tap equivalent of React's `use`. Accepts React contexts and thenables:
 * a context read returns its current value; a pending promise suspends the
 * render by throwing the thenable, a settled one returns its value or throws
 * its rejection reason.
 */
export const use = (usable: unknown): unknown => {
  if (isThenable(usable)) {
    return trackThenable(usable);
  }
  return useContext(usable as never);
};
