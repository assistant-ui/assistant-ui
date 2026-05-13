import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui, useAuiState } from "@assistant-ui/store";

export namespace McpServerPrimitiveRemoveButton {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpServerPrimitiveRemoveButton = forwardRef<
  McpServerPrimitiveRemoveButton.Element,
  McpServerPrimitiveRemoveButton.Props
>((props, ref) => {
  const kind = useAuiState((s) => s.mcpServer.kind);
  const aui = useAui();
  if (kind !== "custom") return null;
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      onClick={(e) => {
        props.onClick?.(e);
        if (e.defaultPrevented) return;
        void aui.mcpServer().remove();
      }}
    />
  );
});

McpServerPrimitiveRemoveButton.displayName = "McpServerPrimitive.RemoveButton";
