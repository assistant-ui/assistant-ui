import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import { ThreadViewportContext } from "./useThreadViewport";
import {
  createThreadViewportActions,
  useThreadViewportState,
} from "./useThreadViewportState";
import { useThreadMessageHeights } from "./useThreadMessageHeights";

export type ThreadViewportProviderProps = PropsWithChildren<{
  options?:
    | {
        autoScroll?: boolean | undefined;
        initialScrollToBottom?: boolean | undefined;
        stickToBottomThreshold?: number | undefined;
      }
    | undefined;
}>;

export const ThreadViewportProvider = ({
  children,
  options,
}: ThreadViewportProviderProps) => {
  const [viewportHeight, setViewportHeightState] = useState(0);
  const [viewportWidth, setViewportWidthState] = useState(80);
  const initialScrollToBottom =
    options?.initialScrollToBottom ?? options?.autoScroll ?? true;

  const setViewportHeight = useCallback((height: number) => {
    setViewportHeightState((previous) => {
      const next = Math.max(0, height);
      return previous === next ? previous : next;
    });
  }, []);

  const setViewportWidth = useCallback((width: number) => {
    setViewportWidthState((previous) => {
      const next = Math.max(1, width);
      return previous === next ? previous : next;
    });
  }, []);

  const { messageHeights, messageKeyOrder, setMessageKeys, setMessageHeight } =
    useThreadMessageHeights({});

  const { state, derived, dispatchWithDerived } = useThreadViewportState({
    viewportHeight,
    messageHeights,
    messageKeyOrder,
    stickToBottomThreshold: options?.stickToBottomThreshold,
    initialScrollToBottom,
  });

  const actions = useMemo(
    () => createThreadViewportActions(dispatchWithDerived),
    [dispatchWithDerived],
  );

  const value = useMemo(
    () => ({
      state: {
        scrollOffset: state.scrollOffset,
        autoScroll: state.autoScroll,
        viewportHeight: state.viewportHeight,
        stickToBottomThreshold: state.stickToBottomThreshold,
        contentHeight: derived.contentHeight,
        maxScrollOffset: derived.maxScrollOffset,
        visibleFirstIndex: derived.visibleFirstIndex,
        visibleLastIndex: derived.visibleLastIndex,
        isAtBottom: derived.isAtBottom,
        messageOffsets: derived.messageOffsets,
        messageHeightsInOrder: derived.messageHeightsInOrder,
        messageKeys: messageKeyOrder,
      },
      actions,
      setViewportHeight,
      setViewportWidth,
      setMessageKeys,
      setMessageHeight,
      viewportWidth,
    }),
    [
      actions,
      derived,
      messageKeyOrder,
      setMessageHeight,
      setMessageKeys,
      setViewportHeight,
      setViewportWidth,
      state,
      viewportWidth,
    ],
  );

  return (
    <ThreadViewportContext.Provider value={value}>
      {children}
    </ThreadViewportContext.Provider>
  );
};

ThreadViewportProvider.displayName = "ThreadPrimitive.ViewportProvider";

export namespace ThreadViewportProvider {
  export type Props = ThreadViewportProviderProps;
}
