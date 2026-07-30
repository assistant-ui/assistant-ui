import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const McpCustomServerByIndexProvider: FC<
  PropsWithChildren<{ index: number }>
> = ({ index, children }) => (
  <AuiProvider
    config={AuiConfig({
      mcpServer: Derived({
        source: "mcp",
        query: { kind: "custom", index },
        get: (parent) => parent.mcp.customServer({ index }),
      }),
    })}
  >
    {children}
  </AuiProvider>
);
