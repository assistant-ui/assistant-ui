"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  useMemo,
  useRef,
} from "react";
import { useAuiState } from "@assistant-ui/store";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Direction } from "radix-ui";
import {
  ThreadListItemFocusProvider,
  useThreadListCollection,
} from "../threadListFocusGroup";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace ThreadListItemPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const ThreadListItemPrimitiveRoot = forwardRef<
  ThreadListItemPrimitiveRoot.Element,
  ThreadListItemPrimitiveRoot.Props
>((props, ref) => {
  const isMain = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const focus = useMemo(() => ({ triggerRef, moreRef }), []);

  const getItems = useThreadListCollection(undefined);
  const direction = Direction.useDirection();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const forwardKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    const trigger = triggerRef.current;
    const more = moreRef.current;

    if (trigger && event.target === trigger) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const triggers = getItems()
          .map((item) => item.ref.current)
          .filter((node): node is HTMLButtonElement => node !== null);
        const next =
          triggers[
            triggers.indexOf(trigger) + (event.key === "ArrowDown" ? 1 : -1)
          ];
        if (next) {
          next.focus();
          event.preventDefault();
        }
      } else if (event.key === forwardKey && more) {
        more.focus();
        event.preventDefault();
      }
    } else if (more && event.target === more && event.key === backKey) {
      trigger?.focus();
      event.preventDefault();
    }
  };

  return (
    <ThreadListItemFocusProvider value={focus}>
      <Primitive.div
        {...(isMain ? { "data-active": "true", "aria-current": "true" } : null)}
        {...props}
        onKeyDown={composeEventHandlers(props.onKeyDown, onKeyDown)}
        ref={ref}
      />
    </ThreadListItemFocusProvider>
  );
});

ThreadListItemPrimitiveRoot.displayName = "ThreadListItemPrimitive.Root";
