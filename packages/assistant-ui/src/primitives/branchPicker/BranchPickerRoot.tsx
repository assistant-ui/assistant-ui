"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import { MessageIf } from "../message/MessageIf";

type BranchPickerRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type BranchPickerRootProps = PrimitiveDivProps;

// TODO put branch state in context?

export const BranchPickerRoot = forwardRef<
  BranchPickerRootElement,
  BranchPickerRootProps
>(({ ...rest }, ref) => {
  return <Primitive.div {...rest} ref={ref} />;
});
