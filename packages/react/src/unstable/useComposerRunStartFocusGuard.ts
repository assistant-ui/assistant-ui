"use client";

import {
  type ComposerRunStartFocusGuard,
  useComposerRunStartFocusGuard,
} from "../primitives/composer/useComposerRunStartFocusGuard";

/**
 * @deprecated Experimental since 2026-11-12. Not scheduled for removal; the API
 * may change in any release.
 */
export type Unstable_ComposerRunStartFocusGuard = ComposerRunStartFocusGuard;

/**
 * The decision `ComposerPrimitive.Input` makes when a run starts: whether the
 * run may move focus into this composer. Alternative composer implementations
 * (`@assistant-ui/react-lexical`) have to make the same call, and can only make
 * it correctly with the thread root from context: a composer portaled outside
 * `ThreadPrimitive.Root` has no `data-aui-thread-root` ancestor.
 *
 * @deprecated Experimental since 2026-11-12. Not scheduled for removal; the API
 * may change in any release.
 */
export const unstable_useComposerRunStartFocusGuard =
  (): Unstable_ComposerRunStartFocusGuard => useComposerRunStartFocusGuard();
