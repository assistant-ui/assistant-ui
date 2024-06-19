"use client";

import { useEffect } from "react";
import { useAssistantContext } from "../context/AssistantContext";
import type { Tool } from "../utils/ModelConfigTypes";
import type { ToolRenderComponent } from "./ToolRenderComponent";

export type UseAssistantTool<TArgs, TResult> = Tool<TArgs, TResult> & {
  name: string;
  render?: ToolRenderComponent<TArgs, TResult>;
};

export const useAssistantTool = <TArgs, TResult>(
  tool: UseAssistantTool<TArgs, TResult>,
) => {
  const { useModelConfig, useToolRenderers } = useAssistantContext();
  const registerModelConfigProvider = useModelConfig(
    (s) => s.registerModelConfigProvider,
  );
  const setToolRenderer = useToolRenderers((s) => s.setToolRenderer);
  useEffect(() => {
    const { name, render, ...rest } = tool;
    const config = {
      tools: {
        [tool.name]: rest,
      },
    };
    const unsub1 = registerModelConfigProvider(() => config);
    const unsub2 = render ? setToolRenderer(name, render) : undefined;
    return () => {
      unsub1();
      unsub2?.();
    };
  }, [registerModelConfigProvider, setToolRenderer, tool]);
};
