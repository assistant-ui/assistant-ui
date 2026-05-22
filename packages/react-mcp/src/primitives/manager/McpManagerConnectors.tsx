import { type FC, type ReactNode, memo, useMemo } from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { McpConnectorByIndexProvider } from "../../context/McpConnectorByIndexProvider";
import type { MCPServerState } from "../../mcp-scope";

// ASCII Unit Separator — never appears in MCP connector ids (uuids, urls,
// app-provided strings).
const SEP = "\x1f";

export namespace McpManagerPrimitiveConnectors {
  export type Props = {
    /**
     * Render function called once per connector. Receives a lazy `server`
     * accessor — reading it inside the render function subscribes to that
     * connector's state.
     */
    children: (value: { server: MCPServerState }) => ReactNode;
  };
}

const McpManagerPrimitiveConnectorsInner: FC<{
  children: (value: { server: MCPServerState }) => ReactNode;
}> = ({ children }) => {
  // Subscribe to the connector id list, joined to a primitive so identity
  // is stable when the list hasn't changed. Re-renders on add/remove/reorder
  // but not on per-item state changes.
  const idsJoined = useAuiState((s) =>
    s.mcp.connectors.map((c) => c.id).join(SEP),
  );
  const ids = useMemo(
    () => (idsJoined ? idsJoined.split(SEP) : []),
    [idsJoined],
  );

  return useMemo(() => {
    if (ids.length === 0) return null;
    return ids.map((id, index) => (
      <McpConnectorByIndexProvider key={id} index={index}>
        <RenderChildrenWithAccessor
          getItemState={(aui) => aui.mcp().connector({ index }).getState()}
        >
          {(getItem) =>
            children({
              get server() {
                return getItem();
              },
            })
          }
        </RenderChildrenWithAccessor>
      </McpConnectorByIndexProvider>
    ));
  }, [ids, children]);
};

/**
 * Renders all connectors declared on `McpManagerResource`.
 *
 * @example
 * ```tsx
 * <McpManagerPrimitive.Connectors>
 *   {({ server }) => (
 *     <McpServerPrimitive.Root>
 *       <McpServerPrimitive.Name />
 *       {server.connectionState === "error" && <p>{server.lastError?.message}</p>}
 *     </McpServerPrimitive.Root>
 *   )}
 * </McpManagerPrimitive.Connectors>
 * ```
 */
export const McpManagerPrimitiveConnectors: FC<McpManagerPrimitiveConnectors.Props> =
  memo(
    McpManagerPrimitiveConnectorsInner,
    (prev, next) => prev.children === next.children,
  );

McpManagerPrimitiveConnectors.displayName = "McpManagerPrimitive.Connectors";
