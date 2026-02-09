"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useAuiState } from "@assistant-ui/store";

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

  return (
    <Primitive.div
      {...(isMain ? { "data-active": "true", "aria-current": "true" } : null)}
      {...props}
      ref={ref}
    />
  );
});

ThreadListItemPrimitiveRoot.displayName = "ThreadListItemPrimitive.Root";
