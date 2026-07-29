import {
  A2UI_SURFACE_ID,
  type A2uiOperationResult,
  type A2uiState,
  type A2uiSurfaceState,
} from "./types";

const OPERATION_KEYS = new Set([
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isVersion = (value: unknown): value is "v0.9" | "v1.0" =>
  value === "v0.9" || value === "v1.0";

const surfaceIdOf = (payload: Record<string, unknown>): string | undefined => {
  const surfaceId = payload["surfaceId"];
  return typeof surfaceId === "string" && surfaceId.length > 0
    ? surfaceId
    : undefined;
};

const withSurfaceId = (
  surface: A2uiSurfaceState,
  surfaceId: string,
): A2uiSurfaceState => {
  Object.defineProperty(surface, A2UI_SURFACE_ID, {
    value: surfaceId,
    enumerable: false,
  });
  return surface;
};

const getSurfaceId = (surface: A2uiSurfaceState): string | undefined =>
  (surface as A2uiSurfaceState & { [A2UI_SURFACE_ID]?: string })[
    A2UI_SURFACE_ID
  ];

const cloneSurface = (
  surface: A2uiSurfaceState,
  surfaceId: string,
): A2uiSurfaceState =>
  withSurfaceId(
    {
      components: new Map(surface.components),
      dataModel: surface.dataModel,
    },
    getSurfaceId(surface) ?? surfaceId,
  );

const upsertComponents = (
  surface: A2uiSurfaceState,
  components: unknown,
  warnings: string[],
  operationIndex: number,
): void => {
  if (!Array.isArray(components)) {
    warnings.push(
      `Operation at index ${operationIndex} has malformed components.`,
    );
    return;
  }

  for (
    let componentIndex = 0;
    componentIndex < components.length;
    componentIndex++
  ) {
    const component = components[componentIndex];
    if (
      !isRecord(component) ||
      typeof component["id"] !== "string" ||
      component["id"].length === 0 ||
      typeof component["component"] !== "string" ||
      component["component"].length === 0
    ) {
      warnings.push(
        `Component at index ${componentIndex} in operation ${operationIndex} is malformed.`,
      );
      continue;
    }
    surface.components.set(component["id"], { ...component });
  }
};

const decodePointer = (path: string): string[] | undefined => {
  if (path === "" || path === "/") return [];
  if (!path.startsWith("/")) return undefined;
  return path
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
};

const isArrayIndex = (segment: string): boolean =>
  segment === "0" || /^[1-9]\d*$/.test(segment);

const setAtPointer = (
  model: unknown,
  path: string,
  value: unknown,
): { readonly ok: boolean; readonly value: unknown } => {
  const segments = decodePointer(path);
  if (!segments) return { ok: false, value: model };
  if (segments.length === 0) return { ok: true, value };

  const update = (current: unknown, index: number): unknown => {
    const segment = segments[index]!;
    const isLast = index === segments.length - 1;

    if (Array.isArray(current)) {
      if (segment !== "-" && !isArrayIndex(segment)) return current;
      const clone = current.slice();
      const targetIndex = segment === "-" ? clone.length : Number(segment);
      clone[targetIndex] = isLast
        ? value
        : update(clone[targetIndex], index + 1);
      return clone;
    }

    const clone: Record<string, unknown> = isRecord(current)
      ? { ...current }
      : {};
    const child = clone[segment];
    clone[segment] = isLast
      ? value
      : update(
          child ??
            (isArrayIndex(segments[index + 1] ?? "") ||
            segments[index + 1] === "-"
              ? []
              : {}),
          index + 1,
        );
    return clone;
  };

  return { ok: true, value: update(model, 0) };
};

const dataModelValue = (
  payload: Record<string, unknown>,
): { readonly found: boolean; readonly value: unknown } => {
  for (const key of ["contents", "value", "data"] as const) {
    if (payload[key] !== undefined) {
      return { found: true, value: payload[key] };
    }
  }
  return { found: false, value: undefined };
};

export function applyA2uiOperations(
  state: A2uiState,
  operations: unknown,
): A2uiOperationResult {
  const nextState = new Map(state);
  const warnings: string[] = [];

  if (!Array.isArray(operations)) {
    return {
      state: nextState,
      warnings: ["A2UI operations must be an array."],
    };
  }

  for (let index = 0; index < operations.length; index++) {
    try {
      const entry = operations[index];
      if (!isRecord(entry)) {
        warnings.push(`Operation at index ${index} is malformed.`);
        continue;
      }

      const version = entry["version"];
      if (!isVersion(version)) {
        warnings.push(
          `Operation at index ${index} has an unsupported version.`,
        );
        continue;
      }

      const operationKeys = Object.keys(entry).filter(
        (key) => key !== "version",
      );
      if (operationKeys.length !== 1) {
        warnings.push(
          `Operation at index ${index} must contain exactly one operation key.`,
        );
        continue;
      }

      const operationKey = operationKeys[0]!;
      if (!OPERATION_KEYS.has(operationKey)) {
        warnings.push(
          `Unknown A2UI operation "${operationKey}" at index ${index}.`,
        );
        continue;
      }

      const payload = entry[operationKey];
      if (!isRecord(payload)) {
        warnings.push(`Operation at index ${index} has a malformed payload.`);
        continue;
      }

      const surfaceId = surfaceIdOf(payload);
      if (!surfaceId) {
        warnings.push(`Operation at index ${index} has no valid surfaceId.`);
        continue;
      }

      if (operationKey === "createSurface") {
        const surface = withSurfaceId(
          {
            components: new Map(),
            dataModel:
              version === "v1.0" && payload["dataModel"] !== undefined
                ? payload["dataModel"]
                : undefined,
          },
          surfaceId,
        );
        if (version === "v1.0" && payload["components"] !== undefined) {
          upsertComponents(surface, payload["components"], warnings, index);
        }
        nextState.set(surfaceId, surface);
        continue;
      }

      if (operationKey === "deleteSurface") {
        nextState.delete(surfaceId);
        continue;
      }

      const currentSurface = nextState.get(surfaceId);
      if (!currentSurface) {
        warnings.push(
          `Operation at index ${index} references missing surface "${surfaceId}".`,
        );
        continue;
      }
      const surface = cloneSurface(currentSurface, surfaceId);

      if (operationKey === "updateComponents") {
        upsertComponents(surface, payload["components"], warnings, index);
        nextState.set(surfaceId, surface);
        continue;
      }

      const update = dataModelValue(payload);
      if (!update.found) {
        warnings.push(`Operation at index ${index} has no data model value.`);
        continue;
      }
      const path = payload["path"] ?? "/";
      if (typeof path !== "string") {
        warnings.push(
          `Operation at index ${index} has a malformed data model path.`,
        );
        continue;
      }
      const result = setAtPointer(surface.dataModel, path, update.value);
      if (!result.ok) {
        warnings.push(
          `Operation at index ${index} has an invalid JSON Pointer path.`,
        );
        continue;
      }
      surface.dataModel = result.value;
      nextState.set(surfaceId, surface);
    } catch {
      warnings.push(`Operation at index ${index} is malformed.`);
    }
  }

  return { state: nextState, warnings };
}
