import type { ChangeEventHandler, ComponentPropsWithoutRef, FC } from "react";
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
  const { state, errorId, setField } = useAddForm();
  const bearerTokenError =
    state.authType === "bearer" && state.error === "Bearer token is required";

  const getFieldProps = (
    key: "bearerToken" | "scopes",
    value: string,
    invalid: boolean,
  ): McpAddFormPrimitiveAuthFields.FieldProps => ({
    id: `${errorId}-${key}`,
    type: key === "bearerToken" ? "password" : "text",
    placeholder:
      key === "bearerToken"
        ? "Bearer token"
        : "Scopes (space-separated, optional)",
    value,
    onChange: ((e) =>
      setField(
        key,
        e.target.value,
      )) satisfies ChangeEventHandler<HTMLInputElement>,
    "aria-label": key === "bearerToken" ? "Bearer token" : "OAuth scopes",
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? errorId : undefined,
  });

  const bearerToken = getFieldProps(
    "bearerToken",
    state.bearerToken,
    bearerTokenError,
  );
  const scopes = getFieldProps("scopes", state.scopes, false);

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
    return <input {...bearerToken} data-mcp-auth-field="bearer-token" />;
  }

  if (state.authType === "oauth") {
    return <input {...scopes} data-mcp-auth-field="oauth-scopes" />;
  }

  return null;
};

McpAddFormPrimitiveAuthFields.displayName = "McpAddFormPrimitive.AuthFields";
