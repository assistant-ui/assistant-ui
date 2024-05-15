"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";
import { If } from "../message";

type ActionBarRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ActionBarRootProps = PrimitiveDivProps & {
  hideWhenEditing?: boolean;
};

export const ActionBarRoot = forwardRef<
  ActionBarRootElement,
  ActionBarRootProps
>(({ hideWhenEditing = false, ...rest }, ref) => {
  return (
    <If editing={hideWhenEditing ? false : undefined}>
      <Primitive.div {...rest} ref={ref} />
    </If>
  );
});
