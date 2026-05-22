import type { FC } from "react";
import { useAddForm } from "./context";

export namespace McpAddFormPrimitiveAuthFields {
  export type Props = {
    /**
     * Optional render override. Receives the current auth type so apps can render
     * fully custom inputs. Defaults to a minimal built-in for bearer / oauth.
     */
    children?: FC<{ authType: "none" | "bearer" | "oauth" }>;
  };
}

export const McpAddFormPrimitiveAuthFields: FC<
  McpAddFormPrimitiveAuthFields.Props
> = ({ children }) => {
  const { state, setField } = useAddForm();

  if (children) {
    const Render = children;
    return <Render authType={state.authType} />;
  }

  if (state.authType === "bearer") {
    return (
      <input
        type="password"
        placeholder="Bearer token"
        value={state.bearerToken}
        onChange={(e) => setField("bearerToken", e.target.value)}
        data-mcp-auth-field="bearer-token"
      />
    );
  }

  if (state.authType === "oauth") {
    return (
      <input
        type="text"
        placeholder="Scopes (space-separated, optional)"
        value={state.scopes}
        onChange={(e) => setField("scopes", e.target.value)}
        data-mcp-auth-field="oauth-scopes"
      />
    );
  }

  return null;
};

McpAddFormPrimitiveAuthFields.displayName = "McpAddFormPrimitive.AuthFields";
