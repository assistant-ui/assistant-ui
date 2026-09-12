import { createContext, useContext } from "react";
import type { MCPAuthConfig } from "../../mcp-scope";

export type AddFormAuthType = MCPAuthConfig["type"];

export type AddFormErrorField = "name" | "url" | "bearerToken" | "form" | null;

export type AddFormFieldIds = {
  name: string;
  url: string;
  auth: string;
  bearerToken: string;
  scopes: string;
  error: string;
};

export type AddFormState = {
  name: string;
  url: string;
  authType: AddFormAuthType;
  bearerToken: string;
  scopes: string;
  submitting: boolean;
  error: string | null;
  errorField: AddFormErrorField;
};

export type AddFormContextValue = {
  state: AddFormState;
  ids: AddFormFieldIds;
  setField: <K extends keyof AddFormState>(
    key: K,
    value: AddFormState[K],
  ) => void;
  reset: () => void;
  submit: () => Promise<void>;
  cancel: () => void;
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
