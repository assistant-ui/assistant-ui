import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveBearerTokenField {
  export type Element = ComponentRef<typeof Primitive.input>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.input>,
    "value" | "onChange" | "type"
  >;
}

export const McpAddFormPrimitiveBearerTokenField = forwardRef<
  McpAddFormPrimitiveBearerTokenField.Element,
  McpAddFormPrimitiveBearerTokenField.Props
>((props, ref) => {
  const { state, ids, setField } = useAddForm();
  return (
    <Primitive.input
      type="password"
      {...props}
      aria-invalid={
        props["aria-invalid"] ??
        (state.errorField === "bearerToken" ? true : undefined)
      }
      aria-describedby={
        [
          props["aria-describedby"],
          state.errorField === "bearerToken" ? ids.error : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      ref={ref}
      value={state.bearerToken}
      onChange={(e) => setField("bearerToken", e.target.value)}
    />
  );
});

McpAddFormPrimitiveBearerTokenField.displayName =
  "McpAddFormPrimitive.BearerTokenField";
