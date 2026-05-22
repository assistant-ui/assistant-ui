import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";
import { Primitive } from "@radix-ui/react-primitive";
import { useAuiState } from "@assistant-ui/store";

export namespace McpServerPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

export const McpServerPrimitiveRoot = forwardRef<
  McpServerPrimitiveRoot.Element,
  McpServerPrimitiveRoot.Props
>((props, ref) => {
  const id = useAuiState((s) => s.mcpServer.id);
  const kind = useAuiState((s) => s.mcpServer.kind);
  const connectionState = useAuiState((s) => s.mcpServer.connectionState);
  const hasError = useAuiState((s) => s.mcpServer.lastError !== null);

  return (
    <Primitive.div
      {...props}
      ref={ref}
      data-server-id={id}
      data-kind={kind}
      data-connection-state={connectionState}
      data-has-error={hasError || undefined}
    />
  );
});

McpServerPrimitiveRoot.displayName = "McpServerPrimitive.Root";
