"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";
import { If } from "../message";

type EditBarRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

type EditBarRootProps = PrimitiveDivProps & {
  hideWhenNotEditing?: boolean;
};

export const EditBarRoot = forwardRef<EditBarRootElement, EditBarRootProps>(
  ({ hideWhenNotEditing, ...rest }, ref) => {
    return (
      <If editing={hideWhenNotEditing ? true : undefined}>
        <Primitive.div {...rest} ref={ref} />
      </If>
    );
  },
);
