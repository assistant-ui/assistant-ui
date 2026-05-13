import { createContext, useContext } from "react";
import type { MCPAuthConfig } from "../../mcp-scope";

export type AddFormAuthType = "none" | "bearer" | "oauth";

export type AddFormState = {
  name: string;
  url: string;
  authType: AddFormAuthType;
  bearerToken: string;
  scopes: string;
  submitting: boolean;
  error: string | null;
};

export type AddFormContextValue = {
  state: AddFormState;
  setField: <K extends keyof AddFormState>(
    key: K,
    value: AddFormState[K],
  ) => void;
  reset: () => void;
  submit: () => Promise<void>;
  cancel: () => void;
  buildAuth: () => MCPAuthConfig;
};

export const AddFormContext = createContext<AddFormContextValue | null>(null);

export const useAddForm = (): AddFormContextValue => {
  const ctx = useContext(AddFormContext);
  if (!ctx) {
    throw new Error(
      "McpAddFormPrimitive.* must be used inside McpAddFormPrimitive.Root",
    );
  }
  return ctx;
};
