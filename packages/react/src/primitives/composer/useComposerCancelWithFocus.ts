"use client";

import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { useThreadRootElementRef } from "../thread/ThreadRootElementContext";
import { COMPOSER_INPUT_SELECTOR } from "./composerInputSelector";

const COMPOSER_SELECTOR = "[data-aui-composer-type]";
const THREAD_SELECTOR = "[data-aui-thread-root]";

export const useComposerCancelWithFocus = (cancel: () => void) => {
  const aui = useAui();
  const threadRootRef = useThreadRootElementRef();

  const cancelWithFocus = useCallback(
    (source: HTMLElement | null) => {
      const root = threadRootRef?.current;
      const doc = source?.ownerDocument;
      const active = doc?.activeElement;
      const composer = source?.closest(COMPOSER_SELECTOR);
      const shouldRestore =
        aui.composer.getState().type === "edit" &&
        root &&
        active &&
        composer?.getAttribute("data-aui-composer-type") === "edit" &&
        composer.contains(active) &&
        composer.closest(THREAD_SELECTOR) === root;
      const candidates = shouldRestore
        ? Array.from(
            root.querySelectorAll<HTMLElement>(COMPOSER_INPUT_SELECTOR),
          ).filter(
            (input) =>
              input.closest(THREAD_SELECTOR) === root &&
              input
                .closest(COMPOSER_SELECTOR)
                ?.getAttribute("data-aui-composer-type") === "thread",
          )
        : [];

      cancel();

      if (!doc || !active || !shouldRestore) return;
      if (doc.activeElement !== active && doc.activeElement !== doc.body)
        return;

      for (const input of candidates) {
        if (!input.isConnected || input.closest("[hidden], [inert]")) continue;
        input.focus({ preventScroll: true });
        if (doc.activeElement !== active && doc.activeElement !== doc.body)
          break;
      }
    },
    [aui, cancel, threadRootRef],
  );

  return cancelWithFocus;
};
