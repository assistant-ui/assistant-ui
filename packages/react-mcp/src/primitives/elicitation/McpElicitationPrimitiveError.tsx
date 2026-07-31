import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useMcpElicitation } from "./context";

export namespace McpElicitationPrimitiveError {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const McpElicitationPrimitiveError = forwardRef<
  McpElicitationPrimitiveError.Element,
  McpElicitationPrimitiveError.Props
>((props, ref) => {
  const error = useMcpElicitation().error;
  if (!error) return null;
  return (
    <Primitive.div
      {...props}
      ref={ref}
      data-properties={error.properties?.join(",")}
    >
      {props.children ?? error.message}
    </Primitive.div>
  );
});

McpElicitationPrimitiveError.displayName = "McpElicitationPrimitive.Error";
