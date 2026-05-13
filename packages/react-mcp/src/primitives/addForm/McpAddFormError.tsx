import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveError {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const McpAddFormPrimitiveError = forwardRef<
  McpAddFormPrimitiveError.Element,
  McpAddFormPrimitiveError.Props
>((props, ref) => {
  const { state } = useAddForm();
  if (!state.error) return null;
  return (
    <Primitive.div {...props} ref={ref}>
      {props.children ?? state.error}
    </Primitive.div>
  );
});

McpAddFormPrimitiveError.displayName = "McpAddFormPrimitive.Error";
