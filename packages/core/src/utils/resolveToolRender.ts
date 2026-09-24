import { isMcpAppUri } from "../types/message";

type ToolRenderState<TRender> = {
  readonly toolUIs: Readonly<
    Record<string, readonly { readonly render: TRender }[] | undefined>
  >;
  readonly mcpApp?: { readonly render: TRender } | undefined;
};

type ToolCallLike = {
  readonly toolName: string;
  readonly mcp?:
    | { readonly app?: { readonly resourceUri?: string | undefined } }
    | undefined;
};

/**
 * The single resolution order every surface renders a tool call through.
 *
 * A registered tool UI is the most specific, then the component a call site
 * named for this tool, then the generic MCP App renderer, which claims only a
 * call whose resource is a `ui://` app. A surface with no per-tool components
 * passes `byName` as undefined.
 *
 * The render type is a parameter so this stays free of React types and the
 * framework-neutral `internal` entry can carry it.
 */
export const resolveToolRender = <TRender>(
  toolsState: ToolRenderState<TRender>,
  part: ToolCallLike,
  byName?: TRender | undefined,
): TRender | null => {
  const named = toolsState.toolUIs[part.toolName]?.[0]?.render ?? null;
  if (named) return named;
  if (byName) return byName;
  if (isMcpAppUri(part.mcp?.app?.resourceUri) && toolsState.mcpApp) {
    return toolsState.mcpApp.render;
  }
  return null;
};
