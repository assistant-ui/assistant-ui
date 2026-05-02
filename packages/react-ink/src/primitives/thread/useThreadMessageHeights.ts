import { useCallback, useMemo, useState } from "react";
import type { ThreadMessageKey } from "./useThreadViewportState";
import { arraysEqual, mapsEqual } from "./utils";

export type ThreadMessageHeightsState = {
  heights: Map<ThreadMessageKey, number>;
  keyOrder: ThreadMessageKey[];
};

export const createInitialThreadMessageHeights = (
  keys: readonly ThreadMessageKey[],
  estimatedHeight: number,
) => new Map(keys.map((key) => [key, Math.max(1, estimatedHeight)]));

export const reconcileThreadMessageHeights = ({
  previousHeights,
  nextKeys,
  estimatedHeight,
}: {
  previousHeights: Map<ThreadMessageKey, number>;
  nextKeys: readonly ThreadMessageKey[];
  estimatedHeight: number;
}): ThreadMessageHeightsState => {
  const heights = new Map<ThreadMessageKey, number>();

  for (const key of nextKeys) {
    heights.set(key, previousHeights.get(key) ?? Math.max(1, estimatedHeight));
  }

  return {
    heights,
    keyOrder: [...nextKeys],
  };
};

export const useThreadMessageHeights = ({
  estimatedHeight = 1,
}: {
  estimatedHeight?: number | undefined;
}) => {
  const [state, setState] = useState<ThreadMessageHeightsState>(() => ({
    heights: createInitialThreadMessageHeights([], estimatedHeight),
    keyOrder: [],
  }));

  const setMessageKeys = useCallback(
    (messageKeys: readonly ThreadMessageKey[]) => {
      setState((previous) => {
        const next = reconcileThreadMessageHeights({
          previousHeights: previous.heights,
          nextKeys: messageKeys,
          estimatedHeight,
        });

        return mapsEqual(previous.heights, next.heights) &&
          arraysEqual(previous.keyOrder, next.keyOrder)
          ? previous
          : next;
      });
    },
    [estimatedHeight],
  );

  const setMessageHeight = useCallback(
    (messageKey: ThreadMessageKey, height: number) => {
      setState((previous) => {
        const nextHeight = Math.max(1, height);
        if (previous.heights.get(messageKey) === nextHeight) {
          return previous;
        }

        const heights = new Map(previous.heights);
        heights.set(messageKey, nextHeight);
        return {
          heights,
          keyOrder: previous.keyOrder,
        };
      });
    },
    [],
  );

  return useMemo(
    () => ({
      messageHeights: state.heights,
      messageKeyOrder: state.keyOrder,
      setMessageKeys,
      setMessageHeight,
    }),
    [state, setMessageKeys, setMessageHeight],
  );
};
