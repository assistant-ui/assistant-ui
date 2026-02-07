"use client";

import { Slot } from "@radix-ui/react-slot";
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
  fillClampThreshold?: string;
  /** Offset used when clamping large user messages */
  fillClampOffset?: string;
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

      const updateMinHeight = () => {
        const state = threadViewportStore.getState();
        if (state.turnAnchor === "top" && shouldApplySlack) {
          const { viewport, inset, userMessage } = state.height;
          const threshold = parseCssLength(fillClampThreshold, el);
          const offset = parseCssLength(fillClampOffset, el);
          const clampAdjustment =
            userMessage <= threshold ? userMessage : offset;

          const minHeight = Math.max(0, viewport - inset - clampAdjustment);
          el.style.minHeight = `${minHeight}px`;
          el.style.flexShrink = "0";
          el.style.transition = "min-height 0s";
        } else {
          el.style.minHeight = "";
          el.style.flexShrink = "";
          el.style.transition = "";
        }
      };

      updateMinHeight();
      return threadViewportStore.subscribe(updateMinHeight);
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
      <Slot ref={ref}>{children}</Slot>
    </SlackNestingContext.Provider>
  );
};

ThreadPrimitiveViewportSlack.displayName = "ThreadPrimitive.ViewportSlack";
