import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace McpServerPrimitiveName {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const McpServerPrimitiveName = forwardRef<
  McpServerPrimitiveName.Element,
  McpServerPrimitiveName.Props
>((props, ref) => {
  const name = useAuiState((s) => s.mcpServer.name);
  return (
    <Primitive.span {...props} ref={ref}>
      {props.children ?? name}
    </Primitive.span>
  );
});

McpServerPrimitiveName.displayName = "McpServerPrimitive.Name";
