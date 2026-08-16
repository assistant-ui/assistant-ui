import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useMcpElicitation } from "./context";

export namespace McpElicitationPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const McpElicitationPrimitiveRoot = forwardRef<
  McpElicitationPrimitiveRoot.Element,
  McpElicitationPrimitiveRoot.Props
>((props, ref) => {
  const elicitation = useMcpElicitation();
  return (
    <Primitive.div {...props} ref={ref} data-elicitation-id={elicitation.id} />
  );
});

McpElicitationPrimitiveRoot.displayName = "McpElicitationPrimitive.Root";
