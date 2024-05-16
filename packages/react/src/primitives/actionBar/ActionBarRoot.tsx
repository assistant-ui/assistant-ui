"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";

type ActionBarRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type ActionBarRootProps = PrimitiveDivProps;

export const ActionBarRoot = forwardRef<
  ActionBarRootElement,
  ActionBarRootProps
>(({ ...rest }, ref) => {
  return <Primitive.div {...rest} ref={ref} />;
});
