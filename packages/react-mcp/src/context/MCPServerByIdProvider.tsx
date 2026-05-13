import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const MCPServerByIdProvider: FC<PropsWithChildren<{ id: string }>> = ({
  id,
  children,
}) => {
  const parentAui = useAui();

  const aui = useAui({
    mcpServer: Derived({
      source: "mcp",
      query: { id },
      get: () => parentAui.mcp().server({ id }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
