import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm, type AddFormAuthType } from "./context";

const AUTH_TYPES: ReadonlySet<AddFormAuthType> = new Set([
  "none",
  "bearer",
  "oauth",
]);

function asAuthType(value: string): AddFormAuthType | null {
  return (AUTH_TYPES as ReadonlySet<string>).has(value)
    ? (value as AddFormAuthType)
    : null;
}

export namespace McpAddFormPrimitiveAuthSelect {
  export type Element = ComponentRef<typeof Primitive.select>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.select>,
    "value" | "onChange"
  >;
}

export const McpAddFormPrimitiveAuthSelect = forwardRef<
  McpAddFormPrimitiveAuthSelect.Element,
  McpAddFormPrimitiveAuthSelect.Props
>((props, ref) => {
  const { state, setField } = useAddForm();
  return (
    <Primitive.select
      {...props}
      ref={ref}
      value={state.authType}
      onChange={(e) => {
        const next = asAuthType(e.target.value);
        if (next) setField("authType", next);
      }}
    >
      {props.children ?? (
        <>
          <option value="oauth">OAuth</option>
          <option value="bearer">Bearer token</option>
          <option value="none">None</option>
        </>
      )}
    </Primitive.select>
  );
});

McpAddFormPrimitiveAuthSelect.displayName = "McpAddFormPrimitive.AuthSelect";
