import type { A2uiServerMessage } from "@assistant-ui/react-a2ui";

const ALL_SURFACE_IDS = ["restaurants", "quiz", "recipe", "tasks"];

export function dismissOtherSurfaces(
  processMessage: (msg: A2uiServerMessage) => void,
  keepSurfaceId: string,
) {
  for (const id of ALL_SURFACE_IDS) {
    if (id !== keepSurfaceId) {
      processMessage({ type: "deleteSurface", surfaceId: id });
    }
  }
}
