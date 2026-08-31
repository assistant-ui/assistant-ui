import { type FC, useCallback, useEffect, useState } from "react";
import type { ToolCallMessagePartProps } from "../types/MessagePartComponentTypes";
import { WritableSubscribable } from "../../subscribable/subscribable";
import { useSubscribable } from "../../store/runtime-clients/useSubscribable";

export const useInlineRender = <TArgs, TResult>(
  toolUI: FC<ToolCallMessagePartProps<TArgs, TResult>>,
): FC<ToolCallMessagePartProps<TArgs, TResult>> => {
  const [toolUIStore] = useState(
    () =>
      new WritableSubscribable<FC<ToolCallMessagePartProps<TArgs, TResult>>>(
        toolUI,
      ),
  );

  useEffect(() => {
    toolUIStore.setState(toolUI);
  }, [toolUI, toolUIStore]);

  return useCallback(
    function ToolUI(args) {
      // Invoked as a plain function so its hooks belong to this component,
      // which keeps its identity while `toolUI` changes underneath.
      const currentToolUI = useSubscribable(toolUIStore);
      return currentToolUI(args);
    },
    [toolUIStore],
  );
};
