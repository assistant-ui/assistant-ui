import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui, useAuiState } from "@assistant-ui/store";

export namespace McpServerPrimitiveDisconnectButton {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

const DISCONNECTABLE = new Set(["connected", "connecting", "authPending"]);

export const McpServerPrimitiveDisconnectButton = forwardRef<
  McpServerPrimitiveDisconnectButton.Element,
  McpServerPrimitiveDisconnectButton.Props
>((props, ref) => {
  const state = useAuiState((s) => s.mcpServer.connectionState);
  const aui = useAui();
  if (!DISCONNECTABLE.has(state)) return null;
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      onClick={(e) => {
        props.onClick?.(e);
        if (e.defaultPrevented) return;
        void aui.mcpServer().disconnect();
      }}
    />
  );
});

McpServerPrimitiveDisconnectButton.displayName =
  "McpServerPrimitive.DisconnectButton";
