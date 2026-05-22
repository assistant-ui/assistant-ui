import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const McpCustomServerByIndexProvider: FC<
  PropsWithChildren<{ index: number }>
> = ({ index, children }) => {
  const aui = useAui({
    mcpServer: Derived({
      source: "mcp",
      query: { kind: "custom", index },
      get: (parent) => parent.mcp().customServer({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
