import { resource, tapState, tapCallback } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { DataRenderersState } from "../types/scopes/dataRenderers";
import type { DataMessagePartComponent } from "../types/MessagePartComponentTypes";

/**
 * Registers renderers for `data` message parts.
 *
 * Data renderers are looked up by the part's `name` field. Use this resource
 * directly for a renderer scope, or prefer {@link useAssistantDataUI} /
 * {@link makeAssistantDataUI} when registering from React components.
 */
export const DataRenderers = resource((): ClientOutput<"dataRenderers"> => {
  const [state, setState] = tapState<DataRenderersState>(() => ({
    renderers: {},
    fallbacks: [],
  }));

  const setDataUI = tapCallback(
    (name: string, render: DataMessagePartComponent) => {
      setState((prev) => {
        return {
          ...prev,
          renderers: {
            ...prev.renderers,
            [name]: [...(prev.renderers[name] ?? []), render],
          },
        };
      });

      return () => {
        setState((prev) => {
          return {
            ...prev,
            renderers: {
              ...prev.renderers,
              [name]: prev.renderers[name]?.filter((r) => r !== render) ?? [],
            },
          };
        });
      };
    },
    [],
  );

  const setFallbackDataUI = tapCallback((render: DataMessagePartComponent) => {
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
});
