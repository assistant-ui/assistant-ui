import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
  isValidElement,
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
  const { state, ids } = useAddForm();
  if (!state.error) return null;
  const childId =
    props.asChild && isValidElement<{ id?: string }>(props.children)
      ? props.children.props.id
      : undefined;
  const customId = childId ?? props.id;
  const needsDescriptionWrapper =
    customId !== undefined && customId !== ids.error;
  const error = (
    <Primitive.div
      {...props}
      id={needsDescriptionWrapper ? props.id : ids.error}
      role={props.role ?? "alert"}
      ref={ref}
    >
      {props.children ?? state.error}
    </Primitive.div>
  );
  return needsDescriptionWrapper ? <div id={ids.error}>{error}</div> : error;
});

McpAddFormPrimitiveError.displayName = "McpAddFormPrimitive.Error";
