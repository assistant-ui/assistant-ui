"use client";

import { forwardRef } from "react";
import {
	type ComponentPropsWithoutRef,
	Primitive,
} from "@radix-ui/react-primitive";

type BranchPickerRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type BranchPickerRootProps = PrimitiveDivProps;

export const BranchPickerRoot = forwardRef<
	BranchPickerRootElement,
	BranchPickerRootProps
>(({ ...rest }, ref) => {
	return <Primitive.div {...rest} ref={ref} />;
});
