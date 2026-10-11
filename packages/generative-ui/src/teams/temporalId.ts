import { classifyTemporal } from "../temporal";
import type { TeamsTemporalField } from "./types";

export const TEMPORAL_INPUT_PREFIX = "aui:datetime:";
const encodeFieldId = (value: string): string =>
  Array.from(value, (char) =>
    /^[\uD800-\uDFFF]$/.test(char)
      ? `%u${char.charCodeAt(0).toString(16).toUpperCase()}`
      : encodeURIComponent(char),
  ).join("");

const decodeFieldId = (value: string): string =>
  value
    .split(/(%uD[89A-F][0-9A-F]{2})/)
    .map((part, index) =>
      index % 2 === 0
        ? decodeURIComponent(part)
        : String.fromCharCode(Number.parseInt(part.slice(2), 16)),
    )
    .join("");

export const encodeTemporalInputId = (field: TeamsTemporalField): string =>
  `${TEMPORAL_INPUT_PREFIX}${field.role}:${encodeFieldId(field.fieldId)}${field.role === "time" ? `:${encodeURIComponent(field.previousValue ?? "")}` : ""}`;

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
    const fieldId = decodeFieldId(parts[1]!);
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
