export { A2uiProvider } from "./react/A2uiProvider";
export type { A2uiProviderProps } from "./react/A2uiProvider";

export { useA2ui } from "./hooks/useA2ui";
export { useA2uiSurfaces } from "./hooks/useA2uiSurfaces";
export { useA2uiSurface } from "./hooks/useA2uiSurface";
export { useA2uiData } from "./hooks/useA2uiData";
export { useA2uiActions } from "./hooks/useA2uiActions";

export { A2uiSurfaceRenderer } from "./react/A2uiSurfaceRenderer";
export { A2uiComponent } from "./react/A2uiComponent";

export { parseA2uiMessage } from "./protocol/parser";
export { resolveValue } from "./registry/resolveValue";

export { createA2uiMessageHandler } from "./bridge/ag-ui-bridge";

export type {
  A2uiSurface,
  A2uiComponentDef,
  A2uiAction,
  A2uiServerMessage,
  A2uiComponentRenderer,
  A2uiComponentProps,
} from "./types";
