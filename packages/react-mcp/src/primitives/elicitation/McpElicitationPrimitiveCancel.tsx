import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui } from "@assistant-ui/store";
import { useMcpElicitation } from "./context";

export namespace McpElicitationPrimitiveCancel {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpElicitationPrimitiveCancel = forwardRef<
  McpElicitationPrimitiveCancel.Element,
  McpElicitationPrimitiveCancel.Props
>((props, ref) => {
  const elicitation = useMcpElicitation();
  const aui = useAui();
  return (
    <Primitive.button
      {...props}
      type="button"
      ref={ref}
      onClick={(event) => {
        props.onClick?.(event);
        if (event.defaultPrevented) return;
        aui.mcpServer.answerElicitation(elicitation.id, {
          action: "cancel",
        });
      }}
    />
  );
});

McpElicitationPrimitiveCancel.displayName = "McpElicitationPrimitive.Cancel";
