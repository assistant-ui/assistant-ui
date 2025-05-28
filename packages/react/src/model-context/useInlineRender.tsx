"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { ToolCallContentPartProps } from "../types";
import { create } from "zustand";

export const useInlineRender = <TArgs, TResult>(
  toolUI: FC<ToolCallContentPartProps<TArgs, TResult>>,
): FC<ToolCallContentPartProps<TArgs, TResult>> => {
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
      const store = useToolUIStore();
      return store.toolUI(args);
    },
    [useToolUIStore],
  );
};
