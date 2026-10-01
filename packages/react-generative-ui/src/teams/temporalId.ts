import { classifyTemporal } from "../temporal";
import type { TeamsTemporalField } from "./types";

export const TEMPORAL_INPUT_PREFIX = "aui:datetime:";

export const encodeTemporalInputId = ({
  dateId,
  previousValue,
}: TeamsTemporalField): string =>
  `${TEMPORAL_INPUT_PREFIX}${encodeURIComponent(dateId)}:${encodeURIComponent(previousValue ?? "")}`;

export const decodeTemporalInputId = (
  id: string,
): TeamsTemporalField | undefined => {
  try {
    const parts = id.slice(TEMPORAL_INPUT_PREFIX.length).split(":");
    if (!id.startsWith(TEMPORAL_INPUT_PREFIX) || parts.length !== 2)
      return undefined;
    const dateId = decodeURIComponent(parts[0]!);
    const previousValue = decodeURIComponent(parts[1]!);
    if (
      !dateId ||
      dateId === "aui" ||
      dateId.startsWith(TEMPORAL_INPUT_PREFIX) ||
      (previousValue !== "" &&
        classifyTemporal(previousValue).kind !== "instant")
    )
      return undefined;
    const metadata = { dateId, ...(previousValue ? { previousValue } : {}) };
    return encodeTemporalInputId(metadata) === id ? metadata : undefined;
  } catch {
    return undefined;
  }
};
