import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace McpServerPrimitiveStatus {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const McpServerPrimitiveStatus = forwardRef<
  McpServerPrimitiveStatus.Element,
  McpServerPrimitiveStatus.Props
>((props, ref) => {
  const state = useAuiState((s) => s.mcpServer.connectionState);
  return (
    <Primitive.span {...props} ref={ref} data-state={state}>
      {props.children ?? state}
    </Primitive.span>
  );
});

McpServerPrimitiveStatus.displayName = "McpServerPrimitive.Status";
