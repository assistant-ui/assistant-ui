import { useState, useCallback } from "react";
import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { DataRenderersState } from "../types/scopes/dataRenderers";
import type { DataMessagePartComponent } from "../types/MessagePartComponentTypes";
import { nullProtoRecord } from "../../utils/record";

/**
 * Registers renderers for `data` message parts.
 *
 * Data renderers are looked up by the part's `name` field. Use this resource
 * directly for a renderer scope, or prefer {@link useAssistantDataUI} /
 * {@link makeAssistantDataUI} when registering from React components.
 */
const useDataRenderers = (): ClientOutput<"dataRenderers"> => {
  const [state, setState] = useState<DataRenderersState>(() => ({
    renderers: nullProtoRecord(),
    fallbacks: [],
  }));

  const setDataUI = useCallback(
    (name: string, render: DataMessagePartComponent) => {
      setState((prev) => {
        const renderers = nullProtoRecord(prev.renderers);
        renderers[name] = [...(renderers[name] ?? []), render];
        return {
          ...prev,
          renderers,
        };
      });

      return () => {
        setState((prev) => {
          const renderers = nullProtoRecord(prev.renderers);
          const remaining = renderers[name]?.filter((r) => r !== render) ?? [];
          if (remaining.length > 0) {
            renderers[name] = remaining;
          } else {
            delete renderers[name];
          }
          return {
            ...prev,
            renderers,
          };
        });
      };
    },
    [],
  );

  const setFallbackDataUI = useCallback((render: DataMessagePartComponent) => {
    setState((prev) => ({
      ...prev,
      fallbacks: [...prev.fallbacks, render],
    }));

    return () => {
      setState((prev) => ({
        ...prev,
        fallbacks: prev.fallbacks.filter((r) => r !== render),
      }));
    };
  }, []);

  return {
    getState: () => state,
    setDataUI,
    setFallbackDataUI,
  };
};

export const DataRenderers = resource(useDataRenderers);
