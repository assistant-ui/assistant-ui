import { type ReactNode, memo } from "react";
import type { ThreadMessage } from "@assistant-ui/core";
import { RenderChildrenWithScope } from "@assistant-ui/store";
import { MessageByIndexProvider } from "@assistant-ui/core/react";

type MemoMessageProps = {
  index: number;
  render: (value: { message: ThreadMessage }) => ReactNode;
};

const MemoMessageImpl = ({ index, render }: MemoMessageProps) => {
  return (
    <MessageByIndexProvider index={index}>
      <RenderChildrenWithScope scope="message">
        {(getItem) =>
          render({
            get message() {
              return getItem();
            },
          })
        }
      </RenderChildrenWithScope>
    </MessageByIndexProvider>
  );
};

MemoMessageImpl.displayName = "ThreadPrimitive.Messages.MemoItem";

export const MemoMessage = memo(
  MemoMessageImpl,
  (prev, next) =>
    prev.index === next.index && Object.is(prev.render, next.render),
);
