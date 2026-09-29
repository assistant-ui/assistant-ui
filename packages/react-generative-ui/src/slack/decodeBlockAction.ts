import type { Action } from "../ir";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionValue = (value: unknown): string | undefined =>
  isRecord(value) && typeof value["value"] === "string"
    ? value["value"]
    : undefined;

/**
 * Decodes one structural entry from a Slack `block_actions` payload.
 * `$input` is reserved for the runtime selection: a `$input` key inside the
 * button's JSON `value` payload is dropped rather than spread into the result.
 */
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
    if (action["type"] === "plain_text_input" && typeof rawValue === "string") {
      plainValue = rawValue;
    } else if (typeof rawValue === "string") {
      try {
        const parsed: unknown = JSON.parse(rawValue);
        if (isRecord(parsed)) {
          payload = parsed;
        } else {
          plainValue = rawValue;
        }
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
    const numberInput =
      action["type"] === "number_input" && typeof rawValue === "string"
        ? Number(rawValue)
        : undefined;
    const input =
      selectedOption ??
      selectedDate ??
      (selectedOptions !== undefined
        ? selectedOptions
        : Number.isFinite(numberInput)
          ? numberInput
          : plainValue);

    return {
      ...Object.fromEntries(
        Object.entries(payload).filter(([key]) => key !== "$input"),
      ),
      type: actionId,
      ...(input !== undefined ? { $input: input } : {}),
    };
  } catch {
    return undefined;
  }
}
