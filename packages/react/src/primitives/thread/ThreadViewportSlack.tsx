"use client";

import { Slot } from "radix-ui";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
} from "react";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import { useAuiState } from "@assistant-ui/store";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import {
  computeTopAnchorTargetScrollTop,
  computeTopAnchorSlack,
} from "./computeTopAnchorSlack";

const SlackNestingContext = createContext(false);

const parseCssLength = (value: string, element: HTMLElement): number => {
  const match = value.match(/^([\d.]+)(em|px|rem)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]!);
  const unit = match[2];

  if (unit === "px") return num;
  if (unit === "em") {
    const fontSize = parseFloat(getComputedStyle(element).fontSize) || 16;
    return num * fontSize;
  }
  if (unit === "rem") {
    const rootFontSize =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return num * rootFontSize;
  }
  return 0;
};

export type ThreadViewportSlackProps = {
  /** Threshold at which the user message height clamps to the offset */
  fillClampThreshold?: string | undefined;
  /** Offset used when clamping large user messages */
  fillClampOffset?: string | undefined;
  children: ReactNode;
};

/**
 * A slot component that provides minimum height to enable scroll anchoring.
 *
 * When using `turnAnchor="top"`, this component ensures there is
 * enough scroll room below the anchor point (last user message) for it to scroll
 * to the top of the viewport. The min-height is applied only to the last
 * assistant message.
 *
 * This component is used internally by MessagePrimitive.Root.
 */
export const ThreadPrimitiveViewportSlack: FC<ThreadViewportSlackProps> = ({
  children,
  fillClampThreshold = "10em",
  fillClampOffset = "6em",
}) => {
  const shouldApplySlack = useAuiState(
    // only add slack to the last assistant message following a user message (valid turn)
    (s) =>
      s.message.isLast &&
      s.message.role === "assistant" &&
      s.message.index >= 1 &&
      s.thread.messages.at(s.message.index - 1)?.role === "user",
  );
  const threadViewportStore = useThreadViewportStore({ optional: true });
  const isNested = useContext(SlackNestingContext);

  const callback = useCallback(
    (el: HTMLElement) => {
      if (!threadViewportStore || isNested) return;
      const store = threadViewportStore;

      let frame: number | null = null;
      let isObservingMutations = false;
      let anchoredAnchor: HTMLElement | null = null;
      function scheduleUpdate() {
        if (frame !== null) return;
        frame = requestAnimationFrame(updateMinHeight);
      }

      const mutationObserver = new MutationObserver((mutations) => {
        const hasRelevantMutation = mutations.some(
          (m) => m.type !== "attributes" || m.attributeName !== "style",
        );
        if (hasRelevantMutation) scheduleUpdate();
      });

      const clearMinHeight = () => {
        if (el.style.minHeight !== "") el.style.minHeight = "";
        if (el.style.flexShrink !== "") el.style.flexShrink = "";
        if (el.style.transition !== "") el.style.transition = "";
      };

      const observeMutations = () => {
        if (isObservingMutations) return;
        mutationObserver.observe(el, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
        isObservingMutations = true;
      };

      const disconnectMutations = () => {
        mutationObserver.disconnect();
        isObservingMutations = false;
      };

      function updateMinHeight() {
        frame = null;
        const state = store.getState();
        const { viewport, anchor, slack } = state.element;

        if (
          state.turnAnchor === "top" &&
          shouldApplySlack &&
          viewport &&
          anchor &&
          slack === el
        ) {
          observeMutations();
          const threshold = parseCssLength(fillClampThreshold, el);
          const offset = parseCssLength(fillClampOffset, el);
          clearMinHeight();

          const naturalHeight = el.offsetHeight;
          const missingScrollRange = computeTopAnchorSlack({
            viewport,
            anchor,
            fillClampThreshold: threshold,
            fillClampOffset: offset,
          });
          const minHeight =
            missingScrollRange > 0
              ? `${naturalHeight + missingScrollRange}px`
              : "";

          if (el.style.minHeight !== minHeight) el.style.minHeight = minHeight;
          if (el.style.flexShrink !== "0") el.style.flexShrink = "0";
          if (el.style.transition !== "min-height 0s") {
            el.style.transition = "min-height 0s";
          }

          if (anchoredAnchor !== anchor) {
            anchoredAnchor = anchor;
            const scrollTop = computeTopAnchorTargetScrollTop({
              viewport,
              anchor,
              fillClampThreshold: threshold,
              fillClampOffset: offset,
            });
            if (Math.abs(viewport.scrollTop - scrollTop) > 1) {
              viewport.scrollTo({ top: scrollTop, behavior: "auto" });
            }
          }
        } else {
          anchoredAnchor = null;
          clearMinHeight();
          disconnectMutations();
        }
      }

      const unregisterSlackElement = store.getState().registerSlackElement(el);
      let lastLayoutState = store.getState();
      scheduleUpdate();
      const unsubscribe = store.subscribe((state) => {
        const prev = lastLayoutState;
        lastLayoutState = state;

        if (
          state.turnAnchor !== prev.turnAnchor ||
          state.element.viewport !== prev.element.viewport ||
          state.element.anchor !== prev.element.anchor ||
          state.element.slack !== prev.element.slack
        ) {
          scheduleUpdate();
        }
      });

      return () => {
        if (frame !== null) cancelAnimationFrame(frame);
        unregisterSlackElement();
        unsubscribe();
        disconnectMutations();
        clearMinHeight();
      };
    },
    [
      threadViewportStore,
      shouldApplySlack,
      isNested,
      fillClampThreshold,
      fillClampOffset,
    ],
  );

  const ref = useManagedRef<HTMLElement>(callback);

  return (
    <SlackNestingContext.Provider value={true}>
      <Slot.Root ref={ref}>{children}</Slot.Root>
    </SlackNestingContext.Provider>
  );
};

ThreadPrimitiveViewportSlack.displayName = "ThreadPrimitive.ViewportSlack";
