import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useMcpServerTool } from "./McpServerTools";

export namespace McpServerPrimitiveToolName {
  export type Element = ComponentRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

export const McpServerPrimitiveToolName = forwardRef<
  McpServerPrimitiveToolName.Element,
  McpServerPrimitiveToolName.Props
>((props, ref) => {
  const tool = useMcpServerTool();
  return (
    <Primitive.span {...props} ref={ref} data-tool-name={tool.name}>
      {props.children ?? tool.name}
    </Primitive.span>
  );
});

McpServerPrimitiveToolName.displayName = "McpServerPrimitive.ToolName";
