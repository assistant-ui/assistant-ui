import {
  useCallback,
  useEffect,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from "react";
import { useAui, type ComponentMessagePartProps } from "@assistant-ui/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { AISDK_JSON_RENDER_COMPONENT_NAME } from "./utils/convertMessage";

export { AISDK_JSON_RENDER_COMPONENT_NAME };

export type JsonRenderHostRenderContext = {
  instanceId: string | undefined;
  spec: unknown;
  specType: string | undefined;
  props: ReadonlyJSONObject | undefined;
  invoke: (action: string, payload?: unknown) => Promise<unknown>;
  emit: (event: string, payload?: unknown) => void;
};

export type JsonRenderHostCatalogRenderer =
  ComponentType<JsonRenderHostRenderContext>;

export type JsonRenderHostCatalog =
  | {
      by_type?:
        | Record<string, JsonRenderHostCatalogRenderer | undefined>
        | undefined;
      Fallback?: JsonRenderHostCatalogRenderer | undefined;
    }
  | {
      Override: JsonRenderHostCatalogRenderer;
    };

export type JsonRenderHostCatalogTelemetryEvent = {
  type:
    | "catalog-hit"
    | "catalog-fallback"
    | "catalog-override"
    | "catalog-miss";
  instanceId: string | undefined;
  specType: string | undefined;
};

export type JsonRenderHostProps = ComponentMessagePartProps & {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  render?: ((context: JsonRenderHostRenderContext) => ReactNode) | undefined;
  catalog?: JsonRenderHostCatalog | undefined;
  onCatalogTelemetry?:
    | ((event: JsonRenderHostCatalogTelemetryEvent) => void)
    | undefined;
};

const isJSONObject = (value: unknown): value is ReadonlyJSONObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getComponentProps = (value: unknown): ReadonlyJSONObject | undefined =>
  isJSONObject(value) ? value : undefined;

const getSpecType = (spec: unknown): string | undefined => {
  if (!isJSONObject(spec)) return undefined;
  const type = spec.type;
  if (typeof type !== "string" || type.length === 0) return undefined;
  return type;
};

export const JsonRenderHost = ({
  instanceId,
  props,
  render,
  catalog,
  onCatalogTelemetry,
  className,
  style,
}: JsonRenderHostProps) => {
  const aui = useAui();
  const component = instanceId
    ? aui.message().component({ instanceId })
    : undefined;
  const componentProps = getComponentProps(props);
  const spec = componentProps?.spec;
  const specType = getSpecType(spec);

  const invoke = useCallback(
    (action: string, payload?: unknown) => {
      if (!component) {
        return Promise.reject(
          new Error("JsonRenderHost requires a component instanceId"),
        );
      }
      return component.invoke(action, payload);
    },
    [component],
  );

  const emit = useCallback(
    (event: string, payload?: unknown) => {
      if (!component) return;
      component.emit(event, payload);
    },
    [component],
  );

  const renderContext: JsonRenderHostRenderContext = {
    instanceId,
    spec,
    specType,
    props: componentProps,
    invoke,
    emit,
  };

  if (render) {
    return <>{render(renderContext)}</>;
  }

  let catalogTelemetryType:
    | JsonRenderHostCatalogTelemetryEvent["type"]
    | undefined;
  let catalogRenderer: JsonRenderHostCatalogRenderer | undefined;
  if (catalog) {
    if ("Override" in catalog) {
      catalogTelemetryType = "catalog-override";
      catalogRenderer = catalog.Override;
    } else {
      const matchedRenderer = specType
        ? catalog.by_type?.[specType]
        : undefined;
      if (matchedRenderer) {
        catalogTelemetryType = "catalog-hit";
        catalogRenderer = matchedRenderer;
      } else if (catalog.Fallback) {
        catalogTelemetryType = "catalog-fallback";
        catalogRenderer = catalog.Fallback;
      } else {
        catalogTelemetryType = "catalog-miss";
      }
    }
  }

  useEffect(() => {
    if (!onCatalogTelemetry || !catalogTelemetryType) return;
    onCatalogTelemetry({
      type: catalogTelemetryType,
      instanceId,
      specType,
    });
  }, [catalogTelemetryType, instanceId, onCatalogTelemetry, specType]);

  if (catalogRenderer) {
    const CatalogRenderer = catalogRenderer;
    return <CatalogRenderer {...renderContext} />;
  }

  return (
    <pre className={className} style={style} data-testid="json-render-host">
      {JSON.stringify(spec ?? null, null, 2)}
    </pre>
  );
};
