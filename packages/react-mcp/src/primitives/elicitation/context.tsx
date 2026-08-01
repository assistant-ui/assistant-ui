import { createContext, useContext } from "react";
import type { MCPElicitation } from "../../mcp-scope";

export type ElicitationContextValue = {
  elicitation: MCPElicitation;
  draft: Record<string, unknown>;
  setField: (name: string, value: unknown) => void;
};

export type ElicitationFieldContextValue = {
  name: string;
  schema: unknown;
  value: unknown;
  setValue: (value: unknown) => void;
};

export const ElicitationContext = createContext<ElicitationContextValue | null>(
  null,
);

export const ElicitationFieldContext =
  createContext<ElicitationFieldContextValue | null>(null);

export const useElicitationContext = (): ElicitationContextValue => {
  const context = useContext(ElicitationContext);
  if (!context) {
    throw new Error(
      "useMcpElicitation must be used inside <McpElicitationPrimitive.Items>",
    );
  }
  return context;
};

export const useMcpElicitation = (): MCPElicitation =>
  useElicitationContext().elicitation;

export const useMcpElicitationField = (): ElicitationFieldContextValue => {
  const context = useContext(ElicitationFieldContext);
  if (!context) {
    throw new Error(
      "useMcpElicitationField must be used inside <McpElicitationPrimitive.Fields>",
    );
  }
  return context;
};
