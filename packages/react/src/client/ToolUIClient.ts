import { resource, tapState } from "@assistant-ui/tap";
import { tapApi } from "../utils/tap-store";
import { ToolUIState, ToolUIApi } from "./types/ToolUI";

export const ToolUIClient = resource(() => {
  const [state, setState] = tapState<ToolUIState>(() => ({
    tools: {},
    fallback: [],
    layout: [],
  }));

  return tapApi<ToolUIApi>({
    getState: () => state,

    setToolUI: (toolName, render) => {
      setState((prev) => {
        return {
          ...prev,
          tools: {
            ...prev.tools,
            [toolName]: [...(prev.tools[toolName] ?? []), render],
          },
        };
      });

      return () => {
        setState((prev) => {
          return {
            ...prev,
            tools: {
              ...prev.tools,
              [toolName]:
                prev.tools[toolName]?.filter((r) => r !== render) ?? [],
            },
          };
        });
      };
    },

    setFallbackToolUI: (render) => {
      setState((prev) => {
        return {
          ...prev,
          fallback: [...prev.fallback, render],
        };
      });

      return () => {
        setState((prev) => {
          return {
            ...prev,
            fallback: prev.fallback.filter((r) => r !== render),
          };
        });
      };
    },

    setToolUILayout: (render) => {
      setState((prev) => {
        return {
          ...prev,
          layout: [...prev.layout, render],
        };
      });

      return () => {
        setState((prev) => {
          return {
            ...prev,
            layout: prev.layout.filter((r) => r !== render),
          };
        });
      };
    },
  });
});
