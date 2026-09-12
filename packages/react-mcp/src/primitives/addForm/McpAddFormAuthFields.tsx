import type { FC } from "react";
import { type AddFormAuthType, useAddForm } from "./context";

export namespace McpAddFormPrimitiveAuthFields {
  export type Props = {
    /**
     * Optional render override. Receives the current auth type so apps can render
     * fully custom inputs. Defaults to a minimal built-in for bearer / oauth.
     */
    children?: FC<{ authType: AddFormAuthType }>;
  };
}

export const McpAddFormPrimitiveAuthFields: FC<
  McpAddFormPrimitiveAuthFields.Props
> = ({ children }) => {
  const { state, ids, setField } = useAddForm();

  if (children) {
    const Render = children;
    return <Render authType={state.authType} />;
  }

  if (state.authType === "bearer") {
    return (
      <div>
        <label htmlFor={ids.bearerToken}>Bearer token</label>
        <input
          id={ids.bearerToken}
          type="password"
          placeholder="Bearer token"
          value={state.bearerToken}
          onChange={(e) => setField("bearerToken", e.target.value)}
          aria-invalid={state.errorField === "bearerToken" ? true : undefined}
          aria-describedby={
            state.errorField === "bearerToken" ? ids.error : undefined
          }
          data-mcp-auth-field="bearer-token"
        />
      </div>
    );
  }

  if (state.authType === "oauth") {
    return (
      <div>
        <label htmlFor={ids.scopes}>OAuth scopes</label>
        <input
          id={ids.scopes}
          type="text"
          placeholder="Scopes (space-separated, optional)"
          value={state.scopes}
          onChange={(e) => setField("scopes", e.target.value)}
          data-mcp-auth-field="oauth-scopes"
        />
      </div>
    );
  }

  return null;
};

McpAddFormPrimitiveAuthFields.displayName = "McpAddFormPrimitive.AuthFields";
