import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const McpConnectorByIndexProvider: FC<
  PropsWithChildren<{ index: number }>
> = ({ index, children }) => {
  const aui = useAui({
    mcpServer: Derived({
      source: "mcp",
      query: { kind: "connector", index },
      get: (parent) => parent.mcp().connector({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
