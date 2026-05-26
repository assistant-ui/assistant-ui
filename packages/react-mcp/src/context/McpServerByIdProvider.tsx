import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const McpServerByIdProvider: FC<PropsWithChildren<{ id: string }>> = ({
  id,
  children,
}) => {
  const aui = useAui({
    mcpServer: Derived({
      source: "mcp",
      query: { id },
      get: (parent) => parent.mcp().server({ id }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
