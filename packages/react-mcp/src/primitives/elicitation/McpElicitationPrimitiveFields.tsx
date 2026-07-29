import { type FC, type ReactNode } from "react";
import {
  ElicitationFieldContext,
  type ElicitationFieldContextValue,
  useElicitationContext,
} from "./context";

export { useMcpElicitationField } from "./context";

export namespace McpElicitationPrimitiveFields {
  export type Props = {
    children: (field: ElicitationFieldContextValue) => ReactNode;
  };
}

export const McpElicitationPrimitiveFields: FC<
  McpElicitationPrimitiveFields.Props
> = ({ children }) => {
  const { elicitation, draft, setField } = useElicitationContext();
  const properties = (
    elicitation.requestedSchema as {
      properties?: Record<string, unknown> | undefined;
    } | null
  )?.properties;

  if (
    properties === null ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return null;
  }

  const fields = Object.entries(properties);
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map(([name, schema]) => {
        const field = {
          name,
          schema,
          value: Object.hasOwn(draft, name) ? draft[name] : undefined,
          setValue: (value: unknown) => setField(name, value),
        };
        return (
          <ElicitationFieldContext.Provider key={name} value={field}>
            {children(field)}
          </ElicitationFieldContext.Provider>
        );
      })}
    </>
  );
};

McpElicitationPrimitiveFields.displayName = "McpElicitationPrimitive.Fields";
