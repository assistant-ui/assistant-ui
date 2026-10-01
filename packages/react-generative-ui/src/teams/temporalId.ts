import { classifyTemporal } from "../temporal";
import type { TeamsTemporalField } from "./types";

export const TEMPORAL_INPUT_PREFIX = "aui:datetime:";
export const encodeTemporalInputId = (field: TeamsTemporalField): string =>
  `${TEMPORAL_INPUT_PREFIX}${field.role}:${encodeURIComponent(field.fieldId)}${field.role === "time" ? `:${encodeURIComponent(field.previousValue ?? "")}` : ""}`;

export const decodeTemporalInputId = (
  id: string,
): TeamsTemporalField | undefined => {
  try {
    const parts = id.slice(TEMPORAL_INPUT_PREFIX.length).split(":");
    const role = parts[0];
    if (
      !id.startsWith(TEMPORAL_INPUT_PREFIX) ||
      (role !== "date" && role !== "time") ||
      parts.length !== (role === "date" ? 2 : 3)
    )
      return undefined;
    const fieldId = decodeURIComponent(parts[1]!);
    const previousValue = role === "time" ? decodeURIComponent(parts[2]!) : "";
    if (
      !fieldId ||
      fieldId === "aui" ||
      fieldId.startsWith(TEMPORAL_INPUT_PREFIX) ||
      (previousValue !== "" &&
        classifyTemporal(previousValue).kind !== "instant")
    )
      return undefined;
    const metadata: TeamsTemporalField = {
      fieldId,
      role,
      ...(previousValue ? { previousValue } : {}),
    };
    return encodeTemporalInputId(metadata) === id ? metadata : undefined;
  } catch {
    return undefined;
  }
};
