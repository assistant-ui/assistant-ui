import type { A2uiServerMessage } from "../types";

export function parseA2uiMessage(raw: unknown): A2uiServerMessage | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  const type = payload["type"];
  const surfaceId = payload["surfaceId"];

  if (typeof type !== "string" || typeof surfaceId !== "string") return null;

  switch (type) {
    case "createSurface": {
      const metadata = payload["metadata"];
      return {
        type: "createSurface",
        surfaceId,
        ...(metadata && typeof metadata === "object"
          ? { metadata: metadata as Record<string, unknown> }
          : {}),
      };
    }
    case "updateComponents": {
      const components = payload["components"];
      if (!Array.isArray(components)) return null;
      return { type: "updateComponents", surfaceId, components };
    }
    case "updateDataModel": {
      const path = payload["path"];
      if (typeof path !== "string") return null;
      return {
        type: "updateDataModel",
        surfaceId,
        path,
        value: payload["value"],
      };
    }
    case "deleteSurface":
      return { type: "deleteSurface", surfaceId };
    default:
      return null;
  }
}
