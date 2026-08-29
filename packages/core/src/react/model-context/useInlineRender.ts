import {
  createElement,
  type FC,
  useCallback,
  useEffect,
  useState,
} from "react";
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
      const currentToolUI = useSubscribable(toolUIStore);
      return createElement(currentToolUI, args);
    },
    [toolUIStore],
  );
};
