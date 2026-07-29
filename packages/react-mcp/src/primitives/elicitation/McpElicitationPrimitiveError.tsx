import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useMcpElicitation } from "./context";

export namespace McpElicitationPrimitiveError {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const McpElicitationPrimitiveError = forwardRef<
  McpElicitationPrimitiveError.Element,
  McpElicitationPrimitiveError.Props
>((props, ref) => {
  const error = useMcpElicitation().error;
  if (!error) return null;
  return (
    <Primitive.span
      {...props}
      ref={ref}
      data-properties={error.properties?.join(",")}
    >
      {props.children ?? error.message}
    </Primitive.span>
  );
});

McpElicitationPrimitiveError.displayName = "McpElicitationPrimitive.Error";
