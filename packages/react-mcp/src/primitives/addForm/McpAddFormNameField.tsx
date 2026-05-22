import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveNameField {
  export type Element = ComponentRef<typeof Primitive.input>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.input>,
    "value" | "onChange" | "type"
  >;
}

export const McpAddFormPrimitiveNameField = forwardRef<
  McpAddFormPrimitiveNameField.Element,
  McpAddFormPrimitiveNameField.Props
>((props, ref) => {
  const { state, setField } = useAddForm();
  return (
    <Primitive.input
      type="text"
      placeholder="Name"
      {...props}
      ref={ref}
      value={state.name}
      onChange={(e) => setField("name", e.target.value)}
    />
  );
});

McpAddFormPrimitiveNameField.displayName = "McpAddFormPrimitive.NameField";
