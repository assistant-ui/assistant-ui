import { type FC, type ReactNode, useCallback, useMemo, useState } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { MCPElicitation } from "../../mcp-scope";
import { ElicitationContext } from "./context";

export { useMcpElicitation } from "./context";

export namespace McpElicitationPrimitiveItems {
  export type Props = {
    children: ReactNode | ((elicitation: MCPElicitation) => ReactNode);
  };
}

const McpElicitationPrimitiveItem: FC<{
  elicitation: MCPElicitation;
  children: McpElicitationPrimitiveItems.Props["children"];
}> = ({ elicitation, children }) => {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const setField = useCallback((name: string, value: unknown) => {
    setDraft((current) => ({ ...current, [name]: value }));
  }, []);
  const context = useMemo(
    () => ({ elicitation, draft, setField }),
    [elicitation, draft, setField],
  );

  return (
    <ElicitationContext.Provider value={context}>
      {typeof children === "function" ? children(elicitation) : children}
    </ElicitationContext.Provider>
  );
};

export const McpElicitationPrimitiveItems: FC<
  McpElicitationPrimitiveItems.Props
> = ({ children }) => {
  const elicitations = useAuiState(
    (state) => state.mcpServer.pendingElicitations,
  );
  if (elicitations.length === 0) return null;
  return (
    <>
      {elicitations.map((elicitation) => (
        <McpElicitationPrimitiveItem
          key={elicitation.id}
          elicitation={elicitation}
        >
          {children}
        </McpElicitationPrimitiveItem>
      ))}
    </>
  );
};

McpElicitationPrimitiveItems.displayName = "McpElicitationPrimitive.Items";
