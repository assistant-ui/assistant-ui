"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";
import { MessageIf } from "../message/MessageIf";
import { ThreadIf } from "../thread/ThreadIf";

type ActionBarRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ActionBarRootProps = PrimitiveDivProps & {
  hideWhenBusy?: boolean;
  hideWhenNotLastOrHover?: boolean;
};

export const ActionBarRoot = forwardRef<
  ActionBarRootElement,
  ActionBarRootProps
>(({ hideWhenBusy, hideWhenNotLastOrHover, ...rest }, ref) => {
  return (
    <ThreadIf busy={hideWhenBusy ? false : undefined}>
      <MessageIf lastOrHover={hideWhenNotLastOrHover ? true : undefined}>
        <Primitive.div {...rest} ref={ref} />
      </MessageIf>
    </ThreadIf>
  );
});
