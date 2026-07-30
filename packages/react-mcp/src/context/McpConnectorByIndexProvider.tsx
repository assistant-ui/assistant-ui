import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const McpConnectorByIndexProvider: FC<
  PropsWithChildren<{ index: number }>
> = ({ index, children }) => (
  <AuiProvider
    config={AuiConfig({
      mcpServer: Derived({
        source: "mcp",
        query: { kind: "connector", index },
        get: (parent) => parent.mcp.connector({ index }),
      }),
    })}
  >
    {children}
  </AuiProvider>
);
