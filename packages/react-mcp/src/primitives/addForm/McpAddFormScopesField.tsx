import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveScopesField {
  export type Element = ComponentRef<typeof Primitive.input>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.input>,
    "value" | "onChange" | "type"
  >;
}

export const McpAddFormPrimitiveScopesField = forwardRef<
  McpAddFormPrimitiveScopesField.Element,
  McpAddFormPrimitiveScopesField.Props
>((props, ref) => {
  const { state, setField } = useAddForm();
  return (
    <Primitive.input
      type="text"
      placeholder="Scopes (space-separated, optional)"
      {...props}
      ref={ref}
      value={state.scopes}
      onChange={(e) => setField("scopes", e.target.value)}
    />
  );
});

McpAddFormPrimitiveScopesField.displayName = "McpAddFormPrimitive.ScopesField";
