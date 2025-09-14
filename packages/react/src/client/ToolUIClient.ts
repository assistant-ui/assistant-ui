import { resource, tapState } from "@assistant-ui/tap";
import { tapApi } from "../utils/tap-store";
import { ToolUIState, ToolUIApi } from "./types/ToolUI";

export const ToolUIClient = resource(() => {
  const [state, setState] = tapState<ToolUIState>(() => ({}));

  return tapApi<ToolUIApi>({
    getState: () => state,

    setToolUI: (toolName, render) => {
      setState((prev) => {
        return {
          ...prev,
          [toolName]: [...(prev[toolName] ?? []), render],
        };
      });

      return () => {
        setState((prev) => {
          return {
            ...prev,
            [toolName]: prev[toolName]?.filter((r) => r !== render) ?? [],
          };
        });
      };
    },
  });
});
