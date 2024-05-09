"use client";

import { forwardRef } from "react";
import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";

type EditBarRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type EditBarRootProps = PrimitiveDivProps;

export const EditBarRoot = forwardRef<EditBarRootElement, EditBarRootProps>(
  ({ ...rest }, ref) => {
    return <Primitive.div {...rest} ref={ref} />;
  },
);
