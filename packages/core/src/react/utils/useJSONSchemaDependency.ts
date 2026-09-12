import { useMemo } from "react";
import { toJSONSchema } from "assistant-stream";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { isJSONValue } from "../../utils/json/is-json";
import type { Unstable_InteractableStateSchema } from "../types/scopes/interactables";
import { useJSONEqualValue } from "./useJSONEqual";

export function useJSONSchemaDependency(
  schema: Unstable_InteractableStateSchema,
): ReadonlyJSONValue {
  const normalizedSchema = useMemo(() => {
    try {
      const jsonSchema = toJSONSchema(schema);
      return isJSONValue(jsonSchema) ? jsonSchema : null;
    } catch {
      return null;
    }
  }, [schema]);

  return useJSONEqualValue(normalizedSchema);
}
