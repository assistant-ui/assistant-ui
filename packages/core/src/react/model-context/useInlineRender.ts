import { type FC, useCallback, useEffect, useState } from "react";
import type { ToolCallMessagePartProps } from "../types/MessagePartComponentTypes";
import { create } from "zustand";

export const useInlineRender = <TArgs, TResult>(
  toolUI: FC<ToolCallMessagePartProps<TArgs, TResult>>,
): FC<ToolCallMessagePartProps<TArgs, TResult>> => {
  const [useToolUIStore] = useState(() =>
    create(() => ({
      toolUI,
    })),
  );

  useEffect(() => {
    useToolUIStore.setState({ toolUI });
  }, [toolUI, useToolUIStore]);

  return useCallback(
    function ToolUI(args) {
      // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
      const store = useToolUIStore();
      return store.toolUI(args);
    },
    [useToolUIStore],
  );
};
