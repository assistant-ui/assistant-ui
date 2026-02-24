import { resource, tapState, tapCallback } from "@assistant-ui/tap";
import { type ClientOutput } from "@assistant-ui/store";
import { DataRenderersState } from "../types/scopes";
import { DataMessagePartComponent } from "../types";

export const DataRenderers = resource((): ClientOutput<"dataRenderers"> => {
  const [state, setState] = tapState<DataRenderersState>(() => ({
    renderers: {},
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

  return {
    getState: () => state,
    setDataUI,
  };
});
