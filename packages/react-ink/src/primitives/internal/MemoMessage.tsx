import { type ReactNode, memo } from "react";
import type { ThreadMessage } from "@assistant-ui/core";
import { RenderChildrenWithAccessor } from "@assistant-ui/store";
import { MessageByIndexProvider } from "@assistant-ui/core/react";

type MemoMessageProps = {
  index: number;
  render: (value: { message: ThreadMessage }) => ReactNode;
};

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

MemoMessageImpl.displayName = "ThreadPrimitive.Messages.MemoItem";

export const MemoMessage = memo(
  MemoMessageImpl,
  (prev, next) =>
    prev.index === next.index && Object.is(prev.render, next.render),
);
