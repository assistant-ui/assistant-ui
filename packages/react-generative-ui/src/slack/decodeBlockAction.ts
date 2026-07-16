import type { Action } from "../ir";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionValue = (value: unknown): string | undefined =>
  isRecord(value) && typeof value["value"] === "string"
    ? value["value"]
    : undefined;

/** Decodes one structural entry from a Slack `block_actions` payload. */
export function decodeBlockAction(action: unknown): Action | undefined {
  try {
    if (!isRecord(action) || typeof action["action_id"] !== "string") {
      return undefined;
    }

    const actionId = action["action_id"];
    if (!actionId) return undefined;

    const rawValue = action["value"];
    let payload: Record<string, unknown> = {};
    let plainValue: string | undefined;
    if (typeof rawValue === "string") {
      try {
        const parsed: unknown = JSON.parse(rawValue);
        if (isRecord(parsed)) payload = parsed;
      } catch {
        plainValue = rawValue;
      }
    }

    const selectedOption = optionValue(action["selected_option"]);
    const selectedDate =
      typeof action["selected_date"] === "string"
        ? action["selected_date"]
        : undefined;
    const selectedOptions = Array.isArray(action["selected_options"])
      ? action["selected_options"]
          .map(optionValue)
          .filter((value): value is string => value !== undefined)
      : undefined;
    const input =
      selectedOption ??
      selectedDate ??
      (selectedOptions !== undefined ? selectedOptions : plainValue);

    return {
      ...payload,
      type: actionId,
      ...(input !== undefined ? { $input: input } : {}),
    };
  } catch {
    return undefined;
  }
}
