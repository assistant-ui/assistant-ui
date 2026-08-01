export const A2UI_SURFACE_ID = Symbol("a2uiSurfaceId");

export type A2uiVersion = "v0.9" | "v1.0";

export interface A2uiTemplateChildren {
  readonly template: {
    readonly componentId: string;
    readonly path: string;
  };
}

export interface ComponentNode extends Record<string, unknown> {
  readonly id: string;
  readonly component: string;
  readonly children?: readonly string[] | A2uiTemplateChildren;
}

export interface A2uiCreateSurfaceV09Payload {
  readonly surfaceId: string;
  readonly catalogId?: string;
  readonly theme?: unknown;
  readonly attachDataModel?: unknown;
}

export interface A2uiCreateSurfaceV10Payload {
  readonly surfaceId: string;
  readonly surfaceProperties?: unknown;
  readonly sendDataModel?: unknown;
  readonly components?: readonly ComponentNode[];
  readonly dataModel?: unknown;
}

export interface A2uiUpdateComponentsPayload {
  readonly surfaceId: string;
  readonly components: readonly ComponentNode[];
}

export interface A2uiUpdateDataModelPayload {
  readonly surfaceId: string;
  readonly path?: string;
  readonly contents?: unknown;
  readonly value?: unknown;
  readonly data?: unknown;
}

export interface A2uiDeleteSurfacePayload {
  readonly surfaceId: string;
}

export type A2uiCreateSurfaceOperation =
  | {
      readonly version: "v0.9";
      readonly createSurface: A2uiCreateSurfaceV09Payload;
    }
  | {
      readonly version: "v1.0";
      readonly createSurface: A2uiCreateSurfaceV10Payload;
    };

export interface A2uiUpdateComponentsOperation {
  readonly version: A2uiVersion;
  readonly updateComponents: A2uiUpdateComponentsPayload;
}

export interface A2uiUpdateDataModelOperation {
  readonly version: A2uiVersion;
  readonly updateDataModel: A2uiUpdateDataModelPayload;
}

export interface A2uiDeleteSurfaceOperation {
  readonly version: A2uiVersion;
  readonly deleteSurface: A2uiDeleteSurfacePayload;
}

export type A2uiOperation =
  | A2uiCreateSurfaceOperation
  | A2uiUpdateComponentsOperation
  | A2uiUpdateDataModelOperation
  | A2uiDeleteSurfaceOperation;

export type A2uiSurfaceState = {
  components: Map<string, Record<string, unknown>>;
  dataModel: unknown;
};

export type A2uiState = ReadonlyMap<string, A2uiSurfaceState>;

export interface A2uiOperationResult {
  readonly state: A2uiState;
  readonly warnings: string[];
}
