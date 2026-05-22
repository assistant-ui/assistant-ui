import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveSubmit {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpAddFormPrimitiveSubmit = forwardRef<
  McpAddFormPrimitiveSubmit.Element,
  McpAddFormPrimitiveSubmit.Props
>((props, ref) => {
  const { state } = useAddForm();
  return (
    <Primitive.button
      type="submit"
      {...props}
      ref={ref}
      disabled={props.disabled || state.submitting}
      data-submitting={state.submitting || undefined}
    />
  );
});

McpAddFormPrimitiveSubmit.displayName = "McpAddFormPrimitive.Submit";
