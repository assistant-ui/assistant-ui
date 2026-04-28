"use client";

import { Slot } from "radix-ui";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
} from "react";
import { useAuiState } from "@assistant-ui/store";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import { useManagedRef } from "../../utils/hooks/useManagedRef";

const SlackNestingContext = createContext(false);

export const TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR =
  "data-aui-top-anchor-fill-clamp-threshold";
export const TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR =
  "data-aui-top-anchor-fill-clamp-offset";

export type ThreadViewportSlackProps = {
  /** Threshold at which the user message height clamps to the offset */
  fillClampThreshold?: string | undefined;
  /** Offset used when clamping large user messages */
  fillClampOffset?: string | undefined;
  children: ReactNode;
};

/**
 * Marks the current assistant response for top-turn anchoring.
 *
 * The actual reserved height is owned by ThreadPrimitive.Viewport's stable
 * reserve element. Keeping this component as a marker avoids attaching scroll
 * room to assistant DOM nodes that can be replaced during optimistic-to-real
 * streaming handoff.
 */
export const ThreadPrimitiveViewportSlack: FC<ThreadViewportSlackProps> = ({
  children,
  fillClampThreshold = "10em",
  fillClampOffset = "6em",
}) => {
  const shouldApplySlack = useAuiState(
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
      if (!threadViewportStore || isNested || !shouldApplySlack) return;
      return threadViewportStore.getState().registerSlackElement(el);
    },
    [threadViewportStore, shouldApplySlack, isNested],
  );

  const ref = useManagedRef<HTMLElement>(callback);

  return (
    <SlackNestingContext.Provider value={true}>
      <Slot.Root
        ref={ref}
        data-aui-top-anchor-slack={shouldApplySlack ? "" : undefined}
        {...{
          [TOP_ANCHOR_FILL_CLAMP_THRESHOLD_ATTR]: shouldApplySlack
            ? fillClampThreshold
            : undefined,
          [TOP_ANCHOR_FILL_CLAMP_OFFSET_ATTR]: shouldApplySlack
            ? fillClampOffset
            : undefined,
        }}
      >
        {children}
      </Slot.Root>
    </SlackNestingContext.Provider>
  );
};

ThreadPrimitiveViewportSlack.displayName = "ThreadPrimitive.ViewportSlack";
