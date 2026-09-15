import type { ComponentPropsWithoutRef, FC } from "react";
import { type AddFormAuthType, useAddForm } from "./context";

export namespace McpAddFormPrimitiveAuthFields {
  export type FieldProps = Pick<
    ComponentPropsWithoutRef<"input">,
    | "id"
    | "type"
    | "placeholder"
    | "value"
    | "onChange"
    | "aria-label"
    | "aria-invalid"
    | "aria-describedby"
  >;

  export type RenderProps = {
    authType: AddFormAuthType;
    bearerToken: FieldProps;
    scopes: FieldProps;
  };

  export type Props = {
    /**
     * Optional render override. Receives controlled input props for both auth
     * values, including validation metadata for the active field.
     */
    children?: FC<RenderProps>;
  };
}

export const McpAddFormPrimitiveAuthFields: FC<
  McpAddFormPrimitiveAuthFields.Props
> = ({ children }) => {
  const { state, ids, setField } = useAddForm();
  const bearerToken: McpAddFormPrimitiveAuthFields.FieldProps = {
    id: ids.bearerToken,
    type: "password",
    placeholder: "Bearer token",
    value: state.bearerToken,
    onChange: (e) => setField("bearerToken", e.target.value),
    "aria-label": "Bearer token",
    "aria-invalid": state.errorField === "bearerToken" ? true : undefined,
    "aria-describedby":
      state.errorField === "bearerToken" ? ids.error : undefined,
  };
  const scopes: McpAddFormPrimitiveAuthFields.FieldProps = {
    id: ids.scopes,
    type: "text",
    placeholder: "Scopes (space-separated, optional)",
    value: state.scopes,
    onChange: (e) => setField("scopes", e.target.value),
    "aria-label": "OAuth scopes",
  };

  if (children) {
    const Render = children;
    return (
      <Render
        authType={state.authType}
        bearerToken={bearerToken}
        scopes={scopes}
      />
    );
  }

  if (state.authType === "bearer") {
    return (
      <div>
        <label
          htmlFor={bearerToken.id}
          data-mcp-auth-field-label="bearer-token"
        >
          Bearer token
        </label>
        <input {...bearerToken} data-mcp-auth-field="bearer-token" />
      </div>
    );
  }

  if (state.authType === "oauth") {
    return (
      <div>
        <label htmlFor={ids.scopes} data-mcp-auth-field-label="oauth-scopes">
          OAuth scopes
        </label>
        <input {...scopes} data-mcp-auth-field="oauth-scopes" />
      </div>
    );
  }

  return null;
};

McpAddFormPrimitiveAuthFields.displayName = "McpAddFormPrimitive.AuthFields";
