import { type FC, type ReactNode, createContext, useContext } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { MCPToolInfo } from "../../mcp-scope";

const ToolContext = createContext<MCPToolInfo | null>(null);

export const useMcpServerTool = (): MCPToolInfo => {
  const tool = useContext(ToolContext);
  if (!tool) {
    throw new Error(
      "useMcpServerTool must be used inside <McpServerPrimitive.Tools>",
    );
  }
  return tool;
};

export namespace McpServerPrimitiveTools {
  export type Props = {
    children: ReactNode | ((tool: MCPToolInfo) => ReactNode);
  };
}

export const McpServerPrimitiveTools: FC<McpServerPrimitiveTools.Props> = ({
  children,
}) => {
  const tools = useAuiState((s) => s.mcpServer.tools);
  if (tools.length === 0) return null;
  return (
    <>
      {tools.map((tool) => (
        <ToolContext.Provider key={tool.name} value={tool}>
          {typeof children === "function" ? children(tool) : children}
        </ToolContext.Provider>
      ))}
    </>
  );
};

McpServerPrimitiveTools.displayName = "McpServerPrimitive.Tools";
