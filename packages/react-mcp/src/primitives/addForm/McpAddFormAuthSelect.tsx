import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAddForm, type AddFormAuthType } from "./context";

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
      onChange={(e) => setField("authType", e.target.value as AddFormAuthType)}
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
