import { type FC, type ReactNode, memo, useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { MCPServerByIdProvider } from "../../context/MCPServerByIdProvider";

export namespace McpManagerPrimitiveConnectors {
  export type Props = {
    children: ReactNode;
  };
}

export const McpManagerPrimitiveConnectors: FC<McpManagerPrimitiveConnectors.Props> =
  memo(({ children }) => {
    const ids = useAuiState((s) =>
      s.mcp.connectors.map((c) => c.id).join("\n"),
    );
    const idList = useMemo(() => (ids ? ids.split("\n") : []), [ids]);

    return (
      <>
        {idList.map((id) => (
          <MCPServerByIdProvider key={id} id={id}>
            {children}
          </MCPServerByIdProvider>
        ))}
      </>
    );
  });

McpManagerPrimitiveConnectors.displayName = "McpManagerPrimitive.Connectors";
