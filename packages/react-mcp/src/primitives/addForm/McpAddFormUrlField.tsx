import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveUrlField {
  export type Element = ComponentRef<typeof Primitive.input>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.input>,
    "value" | "onChange" | "type"
  >;
}

export const McpAddFormPrimitiveUrlField = forwardRef<
  McpAddFormPrimitiveUrlField.Element,
  McpAddFormPrimitiveUrlField.Props
>((props, ref) => {
  const { state, ids, setField } = useAddForm();
  return (
    <Primitive.input
      type="url"
      inputMode="url"
      placeholder="https://example.com/mcp"
      {...props}
      id={props.id ?? ids.url}
      aria-label={
        props["aria-label"] ??
        (props.id || props["aria-labelledby"] ? undefined : "URL")
      }
      aria-invalid={
        props["aria-invalid"] ?? (state.errorField === "url" ? true : undefined)
      }
      aria-describedby={
        props["aria-describedby"] ??
        (state.errorField === "url" ? ids.error : undefined)
      }
      ref={ref}
      value={state.url}
      onChange={(e) => setField("url", e.target.value)}
    />
  );
});

McpAddFormPrimitiveUrlField.displayName = "McpAddFormPrimitive.UrlField";
