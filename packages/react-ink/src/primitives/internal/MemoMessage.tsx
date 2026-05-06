import { type ReactNode, memo } from "react";
import type { ThreadMessage } from "@assistant-ui/core";
import { RenderChildrenWithAccessor } from "@assistant-ui/store";
import { MessageByIndexProvider } from "@assistant-ui/core/react";

type MemoMessageProps = {
  index: number;
  render: (value: { message: ThreadMessage }) => ReactNode;
};

/**
 * Stable per-index message boundary.
 *
 * Wrapping each message render in `React.memo` lets the reconciler skip
 * subtrees whose `(index, render)` pair hasn't changed across a parent
 * re-render. With a stable `render` callback (the common case) and a stable
 * index, only the messages whose own `useAuiState` slices change actually
 * re-render — even though `ThreadMessages` itself re-runs on every length
 * change. In a 1000-message thread under streaming, this collapses an O(n)
 * walk into O(1) per token.
 *
 * Internal component. Not exported from the public surface.
 */
const MemoMessageImpl = ({ index, render }: MemoMessageProps) => {
  return (
    <MessageByIndexProvider index={index}>
      <RenderChildrenWithAccessor
        getItemState={(aui) => aui.thread().message({ index }).getState()}
      >
        {(getItem) =>
          render({
            get message() {
              return getItem();
            },
          })
        }
      </RenderChildrenWithAccessor>
    </MessageByIndexProvider>
  );
};

export const MemoMessage = memo(
  MemoMessageImpl,
  (prev, next) =>
    prev.index === next.index && Object.is(prev.render, next.render),
);
