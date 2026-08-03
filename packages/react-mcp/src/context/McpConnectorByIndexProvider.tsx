import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const McpConnectorByIndexProvider: FC<
  PropsWithChildren<{ index: number }>
> = ({ index, children }) => {
  const aui = useAui();
  const config = AuiConfig({
    mcpServer: Derived({
      source: "mcp",
      query: { kind: "connector", index },
      get: (parent) => parent.mcp.connector({ index }),
    }),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};
