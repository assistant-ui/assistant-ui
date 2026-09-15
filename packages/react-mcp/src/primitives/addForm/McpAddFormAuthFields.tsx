import type { FC } from "react";
import { McpAddFormPrimitiveBearerTokenField } from "./McpAddFormBearerTokenField";
import { McpAddFormPrimitiveScopesField } from "./McpAddFormScopesField";
import { type AddFormAuthType, useAddForm } from "./context";

export namespace McpAddFormPrimitiveAuthFields {
  export type Props = {
    /**
     * Optional render override. Receives the current auth type so apps can render
     * fully custom inputs, bound to the form through `BearerTokenField` and
     * `ScopesField`. Defaults to a minimal built-in for bearer / oauth.
     */
    children?: FC<{ authType: AddFormAuthType }>;
  };
}

export const McpAddFormPrimitiveAuthFields: FC<
  McpAddFormPrimitiveAuthFields.Props
> = ({ children }) => {
  const { state, ids } = useAddForm();

  if (children) {
    const Render = children;
    return <Render authType={state.authType} />;
  }

  if (state.authType === "bearer") {
    return (
      <div>
        <label
          htmlFor={ids.bearerToken}
          data-mcp-auth-field-label="bearer-token"
        >
          Bearer token
        </label>
        <McpAddFormPrimitiveBearerTokenField
          id={ids.bearerToken}
          data-mcp-auth-field="bearer-token"
        />
      </div>
    );
  }

  if (state.authType === "oauth") {
    return (
      <div>
        <label htmlFor={ids.scopes} data-mcp-auth-field-label="oauth-scopes">
          OAuth scopes
        </label>
        <McpAddFormPrimitiveScopesField
          id={ids.scopes}
          data-mcp-auth-field="oauth-scopes"
        />
      </div>
    );
  }

  return null;
};

McpAddFormPrimitiveAuthFields.displayName = "McpAddFormPrimitive.AuthFields";
