import { type FC, type ReactNode, memo, useMemo } from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { McpCustomServerByIndexProvider } from "../../context/McpCustomServerByIndexProvider";
import type { MCPServerState } from "../../mcp-scope";

const SEP = "\x1f";

export namespace McpManagerPrimitiveCustomServers {
  export type Props = {
    /**
     * Render function called once per custom server. Receives a lazy
     * `server` accessor — reading it inside the render function subscribes
     * to that server's state.
     */
    children: (value: { server: MCPServerState }) => ReactNode;
  };
}

const McpManagerPrimitiveCustomServersInner: FC<{
  children: (value: { server: MCPServerState }) => ReactNode;
}> = ({ children }) => {
  const idsJoined = useAuiState((s) =>
    s.mcp.customServers.map((c) => c.id).join(SEP),
  );
  const ids = useMemo(
    () => (idsJoined ? idsJoined.split(SEP) : []),
    [idsJoined],
  );

  return useMemo(() => {
    if (ids.length === 0) return null;
    return ids.map((id, index) => (
      <McpCustomServerByIndexProvider key={id} index={index}>
        <RenderChildrenWithAccessor
          getItemState={(aui) => aui.mcp().customServer({ index }).getState()}
        >
          {(getItem) =>
            children({
              get server() {
                return getItem();
              },
            })
          }
        </RenderChildrenWithAccessor>
      </McpCustomServerByIndexProvider>
    ));
  }, [ids, children]);
};

/**
 * Renders all user-added custom servers persisted in storage.
 *
 * @example
 * ```tsx
 * <McpManagerPrimitive.CustomServers>
 *   {() => (
 *     <McpServerPrimitive.Root>
 *       <McpServerPrimitive.Name />
 *       <McpServerPrimitive.RemoveButton>Remove</McpServerPrimitive.RemoveButton>
 *     </McpServerPrimitive.Root>
 *   )}
 * </McpManagerPrimitive.CustomServers>
 * ```
 */
export const McpManagerPrimitiveCustomServers: FC<McpManagerPrimitiveCustomServers.Props> =
  memo(
    McpManagerPrimitiveCustomServersInner,
    (prev, next) => prev.children === next.children,
  );

McpManagerPrimitiveCustomServers.displayName =
  "McpManagerPrimitive.CustomServers";
