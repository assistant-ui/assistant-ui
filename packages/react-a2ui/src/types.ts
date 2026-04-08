import type { ComponentType, ReactNode } from "react";

export type A2uiComponentDef = {
  type: string;
  id: string;
  props?: Record<string, unknown>;
  children?: string[];
};

export type A2uiSurface = {
  surfaceId: string;
  components: A2uiComponentDef[];
  metadata?: Record<string, unknown>;
};

export type A2uiServerMessage =
  | {
      type: "createSurface";
      surfaceId: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "updateComponents";
      surfaceId: string;
      components: A2uiComponentDef[];
    }
  | { type: "updateDataModel"; surfaceId: string; path: string; value: unknown }
  | { type: "deleteSurface"; surfaceId: string };

export type A2uiAction = {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context: Record<string, unknown>;
};

export type A2uiComponentProps = {
  def: A2uiComponentDef;
  surfaceId: string;
  getData: (path: string) => unknown;
  onAction: (action: A2uiAction) => void;
  children?: ReactNode;
};

export type A2uiComponentRenderer = ComponentType<A2uiComponentProps>;
