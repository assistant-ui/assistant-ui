"use client";

import { forwardRef } from "react";
import { ComponentPropsWithoutRef, Primitive } from "@radix-ui/react-primitive";
import {
  useMessageContext,
  useThreadContext,
} from "../../utils/context/Context";

type BranchPickerRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type BranchPickerRootProps = PrimitiveDivProps;

// TODO put branch state in context?

export const BranchPickerRoot = forwardRef<
  BranchPickerRootElement,
  BranchPickerRootProps
>(({ ...rest }, ref) => {
  const chat = useThreadContext();
  const message = useMessageContext();
  const { branchCount } = chat.getBranchState(message);
  if (branchCount === 0) return null;

  return <Primitive.div {...rest} ref={ref} />;
});
