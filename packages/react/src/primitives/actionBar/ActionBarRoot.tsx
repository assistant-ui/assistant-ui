"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ComponentRef, forwardRef, ComponentPropsWithoutRef } from "react";
import {
  useActionBarFloatStatus,
  HideAndFloatStatus,
  UseActionBarFloatStatusProps,
} from "./useActionBarFloatStatus";

type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

export namespace ActionBarPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = PrimitiveDivProps & UseActionBarFloatStatusProps;
}

export const ActionBarPrimitiveRoot = forwardRef<
  ActionBarPrimitiveRoot.Element,
  ActionBarPrimitiveRoot.Props
>(({ hideWhenRunning, autohide, autohideFloat, ...rest }, ref) => {
  const hideAndfloatStatus = useActionBarFloatStatus({
    hideWhenRunning,
    autohide,
    autohideFloat,
  });

  if (hideAndfloatStatus === HideAndFloatStatus.Hidden) return null;

  return (
    <Primitive.div
      {...(hideAndfloatStatus === HideAndFloatStatus.Floating
        ? { "data-floating": "true" }
        : null)}
      {...rest}
      ref={ref}
    />
  );
});

ActionBarPrimitiveRoot.displayName = "ActionBarPrimitive.Root";
