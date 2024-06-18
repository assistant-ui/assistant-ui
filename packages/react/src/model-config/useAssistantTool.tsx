"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/AssistantContext";
import type { ToolWithName } from "../utils/ModelConfigTypes";

export const useAssistantTool = <T,>(tool: ToolWithName<T>) => {
  const { useModelConfig } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (s) => s.registerModelConfigProvider,
  );
  useEffect(
    () =>
      registerModelConfigProvider(() => {
        return {
          tools: {
            [tool.name]: tool,
          },
        };
      }),
    [registerModelConfigProvider, tool],
  );
};
