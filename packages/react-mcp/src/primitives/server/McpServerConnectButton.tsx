import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAui, useAuiState } from "@assistant-ui/store";

export namespace McpServerPrimitiveConnectButton {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

const CONNECTABLE = new Set(["disconnected", "error", "authRequired"]);

export const McpServerPrimitiveConnectButton = forwardRef<
  McpServerPrimitiveConnectButton.Element,
  McpServerPrimitiveConnectButton.Props
>((props, ref) => {
  const state = useAuiState((s) => s.mcpServer.connectionState);
  const aui = useAui();
  if (!CONNECTABLE.has(state)) return null;
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      data-state-hint={state === "authRequired" ? "auth-required" : undefined}
      onClick={(e) => {
        props.onClick?.(e);
        if (e.defaultPrevented) return;
        void aui.mcpServer().connect();
      }}
    />
  );
});

McpServerPrimitiveConnectButton.displayName =
  "McpServerPrimitive.ConnectButton";
