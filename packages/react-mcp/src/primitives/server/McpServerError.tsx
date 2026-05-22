import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace McpServerPrimitiveError {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const McpServerPrimitiveError = forwardRef<
  McpServerPrimitiveError.Element,
  McpServerPrimitiveError.Props
>((props, ref) => {
  const message = useAuiState((s) => s.mcpServer.lastError?.message ?? null);
  if (message === null) return null;
  return (
    <Primitive.div {...props} ref={ref}>
      {props.children ?? message}
    </Primitive.div>
  );
});

McpServerPrimitiveError.displayName = "McpServerPrimitive.Error";
