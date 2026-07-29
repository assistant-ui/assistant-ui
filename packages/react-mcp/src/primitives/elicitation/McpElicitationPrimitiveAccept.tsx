import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui } from "@assistant-ui/store";
import { useElicitationContext } from "./context";

export namespace McpElicitationPrimitiveAccept {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpElicitationPrimitiveAccept = forwardRef<
  McpElicitationPrimitiveAccept.Element,
  McpElicitationPrimitiveAccept.Props
>((props, ref) => {
  const { elicitation, draft } = useElicitationContext();
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
          action: "accept",
          content: draft,
        });
      }}
    />
  );
});

McpElicitationPrimitiveAccept.displayName = "McpElicitationPrimitive.Accept";
