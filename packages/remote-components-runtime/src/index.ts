/**
 * `@assistant-ui/remote-components-runtime`: the runtime that makes an HTML document a
 * remote component. Importing it starts it (idempotent) and returns
 * `window.rc`. Pages without a build step use the standalone
 * `rc-runtime.js` instead; both are the same code.
 */
import { start } from "./rc.js";

export type {
  Rc,
  RcEventMap,
  RcOverlayOptions,
  OverlayHandle,
  DismissReason,
  Placement,
} from "./rc.js";

/** `window.rc`, started on first import. */
export const rc =
  typeof window === "undefined" ? (undefined as never) : start();
