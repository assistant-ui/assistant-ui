"use client";

import { useCallback } from "react";
import { useThreadRootElementRef } from "../thread/ThreadRootElementContext";

/**
 * Decides whether a run start may move focus into a composer, mirroring what
 * `ComposerPrimitive.Input` does: focus moves only when it is not somewhere
 * outside the composer and outside the composer's thread.
 */
export type ComposerRunStartFocusGuard = (
  composerElement: HTMLElement | null,
) => boolean;

/**
 * The run-start focus decision `ComposerPrimitive.Input` makes, for other
 * composer implementations (`@assistant-ui/react-lexical`) that have to make the
 * same call. The thread root comes from context, so a composer portaled outside
 * `ThreadPrimitive.Root` still knows which thread it belongs to; reading the
 * `data-aui-thread-root` attribute instead concludes that focus is elsewhere and
 * leaves the keyboard where the thread put it.
 *
 * Returns `false` for a missing element, and for the element itself already
 * holding focus.
 */
export const useComposerRunStartFocusGuard = (): ComposerRunStartFocusGuard => {
  const threadRootRef = useThreadRootElementRef();

  return useCallback(
    (composerElement: HTMLElement | null) => {
      if (!composerElement) return false;

      const doc = composerElement.ownerDocument;
      const active = doc.activeElement;
      if (!active || active === doc.body) return true;
      if (active === composerElement) return false;

      const composerRoot = composerElement.closest("[data-aui-composer-type]");
      if (composerRoot?.contains(active)) return true;

      const threadRoot = threadRootRef?.current ?? null;
      return (
        threadRoot !== null &&
        threadRoot.contains(active) &&
        active.closest("[data-aui-thread-root]") === threadRoot
      );
    },
    [threadRootRef],
  );
};
