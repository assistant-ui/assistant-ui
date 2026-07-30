import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const McpServerByIdProvider: FC<PropsWithChildren<{ id: string }>> = ({
  id,
  children,
}) => {
  const config = AuiConfig({
    mcpServer: Derived({
      source: "mcp",
      query: { id },
      get: (parent) => parent.mcp.server({ id }),
    }),
  });
  return <AuiProvider config={config}>{children}</AuiProvider>;
};
