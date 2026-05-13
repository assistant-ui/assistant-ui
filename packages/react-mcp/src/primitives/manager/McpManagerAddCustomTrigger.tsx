import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace McpManagerPrimitiveAddCustomTrigger {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

export const McpManagerPrimitiveAddCustomTrigger = forwardRef<
  McpManagerPrimitiveAddCustomTrigger.Element,
  McpManagerPrimitiveAddCustomTrigger.Props
>((props, ref) => {
  const canAdd = useAuiState((s) => s.mcp.canAddCustom);
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      disabled={props.disabled || !canAdd}
      data-disabled={!canAdd || undefined}
    />
  );
});

McpManagerPrimitiveAddCustomTrigger.displayName =
  "McpManagerPrimitive.AddCustomTrigger";
