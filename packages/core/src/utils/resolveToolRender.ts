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
