import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useMcpElicitation } from "./context";

export namespace McpElicitationPrimitiveMessage {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const McpElicitationPrimitiveMessage = forwardRef<
  McpElicitationPrimitiveMessage.Element,
  McpElicitationPrimitiveMessage.Props
>((props, ref) => {
  const elicitation = useMcpElicitation();
  return (
    <Primitive.span {...props} ref={ref}>
      {props.children ?? elicitation.message}
    </Primitive.span>
  );
});

McpElicitationPrimitiveMessage.displayName = "McpElicitationPrimitive.Message";
