import {
  A2UI_SURFACE_ID,
  type A2uiSurfaceState,
  type A2uiSurfaceSnapshotOperation,
  type ComponentNode,
} from "./types";

const surfaceIdOf = (surface: A2uiSurfaceState): string | undefined =>
  (surface as A2uiSurfaceState & { [A2UI_SURFACE_ID]?: string })[
    A2UI_SURFACE_ID
  ];

export function surfaceToOperations(
  surface: A2uiSurfaceState,
): readonly A2uiSurfaceSnapshotOperation[] {
  const surfaceId = surfaceIdOf(surface);
  if (!surfaceId) {
    throw new Error("A2UI surfaces must have a surface id to be replayed.");
  }
  return [
    {
      version: "v0.9",
      createSurface: {
        surfaceId,
        ...(surface.catalogId !== undefined
          ? { catalogId: surface.catalogId }
          : {}),
      },
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId,
        components: [...surface.components.values()].map((component) => ({
          ...component,
        })) as ComponentNode[],
      },
    },
    {
      version: "v0.9",
      updateDataModel: {
        surfaceId,
        path: "/",
        contents: surface.dataModel ?? null,
      },
    },
  ];
}
