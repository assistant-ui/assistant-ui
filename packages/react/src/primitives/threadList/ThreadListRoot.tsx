"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { ThreadListCollection } from "../threadListFocusGroup";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace ThreadListPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps;
}

export const ThreadListPrimitiveRoot = forwardRef<
  ThreadListPrimitiveRoot.Element,
  ThreadListPrimitiveRoot.Props
>((props, ref) => {
  return (
    <ThreadListCollection.Provider scope={undefined}>
      <ThreadListCollection.Slot scope={undefined}>
        <Primitive.div {...props} ref={ref} />
      </ThreadListCollection.Slot>
    </ThreadListCollection.Provider>
  );
});

ThreadListPrimitiveRoot.displayName = "ThreadListPrimitive.Root";
