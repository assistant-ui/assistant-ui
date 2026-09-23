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
  surfaceId?: string,
): readonly A2uiSurfaceSnapshotOperation[] {
  const resolvedSurfaceId = surfaceId ?? surfaceIdOf(surface);
  if (resolvedSurfaceId === undefined) {
    throw new Error("A2UI surfaces must have a surface id to be replayed.");
  }
  const operations: A2uiSurfaceSnapshotOperation[] = [
    {
      version: "v0.9",
      createSurface: {
        surfaceId: resolvedSurfaceId,
        ...(surface.catalogId !== undefined
          ? { catalogId: surface.catalogId }
          : {}),
      },
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId: resolvedSurfaceId,
        components: [...surface.components.values()].map((component) => ({
          ...component,
        })) as ComponentNode[],
      },
    },
  ];
  if (surface.dataModel !== undefined) {
    operations.push({
      version: "v0.9",
      updateDataModel: {
        surfaceId: resolvedSurfaceId,
        path: "/",
        contents: surface.dataModel,
      },
    });
  }
  return operations;
}
