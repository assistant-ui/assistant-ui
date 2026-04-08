import type { A2uiComponentDef } from "../types";

export type CreateSurface = {
  surfaceId: string;
  metadata?: Record<string, unknown>;
};

export type UpdateComponents = {
  surfaceId: string;
  components: A2uiComponentDef[];
};

export type UpdateDataModel = {
  surfaceId: string;
  path: string;
  value: unknown;
};

export type DeleteSurface = {
  surfaceId: string;
};
