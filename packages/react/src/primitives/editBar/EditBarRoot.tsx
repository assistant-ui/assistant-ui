"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";

type EditBarRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type EditBarRootProps = PrimitiveDivProps;

export const EditBarRoot = forwardRef<EditBarRootElement, EditBarRootProps>(
  ({ ...rest }, ref) => {
    return <Primitive.div {...rest} ref={ref} />;
  },
);
