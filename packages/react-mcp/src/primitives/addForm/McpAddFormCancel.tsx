import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveCancel {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpAddFormPrimitiveCancel = forwardRef<
  McpAddFormPrimitiveCancel.Element,
  McpAddFormPrimitiveCancel.Props
>((props, ref) => {
  const { cancel } = useAddForm();
  return (
    <Primitive.button
      {...props}
      type="button"
      ref={ref}
      onClick={(e) => {
        props.onClick?.(e);
        if (e.defaultPrevented) return;
        cancel();
      }}
    />
  );
});

McpAddFormPrimitiveCancel.displayName = "McpAddFormPrimitive.Cancel";
