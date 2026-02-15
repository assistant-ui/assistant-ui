import { useCallback, type CSSProperties, type ReactNode } from "react";
import { useAui, type ComponentMessagePartProps } from "@assistant-ui/react";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { AISDK_JSON_RENDER_COMPONENT_NAME } from "./utils/convertMessage";

export { AISDK_JSON_RENDER_COMPONENT_NAME };

export type JsonRenderHostRenderContext = {
  instanceId: string | undefined;
  spec: unknown;
  props: ReadonlyJSONObject | undefined;
  invoke: (action: string, payload?: unknown) => Promise<unknown>;
  emit: (event: string, payload?: unknown) => void;
};

export type JsonRenderHostProps = ComponentMessagePartProps & {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  render?: ((context: JsonRenderHostRenderContext) => ReactNode) | undefined;
};

const isJSONObject = (value: unknown): value is ReadonlyJSONObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getComponentProps = (value: unknown): ReadonlyJSONObject | undefined =>
  isJSONObject(value) ? value : undefined;

export const JsonRenderHost = ({
  instanceId,
  props,
  render,
  className,
  style,
}: JsonRenderHostProps) => {
  const aui = useAui();
  const component = instanceId
    ? aui.message().component({ instanceId })
    : undefined;
  const componentProps = getComponentProps(props);
  const spec = componentProps?.spec;

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

  if (render) {
    return (
      <>
        {render({
          instanceId,
          spec,
          props: componentProps,
          invoke,
          emit,
        })}
      </>
    );
  }

  return (
    <pre className={className} style={style} data-testid="json-render-host">
      {JSON.stringify(spec ?? null, null, 2)}
    </pre>
  );
};
