"use client";
import { useEffect } from "react";
import type { z } from "zod";
import { useAssistantSystemContext } from "./system-context";

export type Tool<TArgs extends object = object> = {
  description: string;
  parameters: z.ZodSchema<TArgs>;
  execute: (args: TArgs) => unknown; // TODO return type
};

export const useRegisterAssistantTool = <T extends object>(
  name: string,
  tool: Tool<T>,
) => {
  const { useAssistantSystem } = useAssistantSystemContext();
  const addTool = useAssistantSystem((s) => s.addTool);
  useEffect(
    () => addTool(name, tool as unknown as Tool),
    [addTool, name, tool],
  );
};
