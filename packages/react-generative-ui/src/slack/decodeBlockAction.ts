import type { Action } from "../ir";
import { resolveFieldReferences } from "../fieldReferences";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionValue = (value: unknown): string | undefined =>
  isRecord(value) && typeof value["value"] === "string"
    ? value["value"]
    : undefined;

const selectedValue = (action: Record<string, unknown>): unknown => {
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
  return (
    selectedOption ??
    selectedDate ??
    (selectedOptions !== undefined ? selectedOptions : undefined)
  );
};

const fieldMappingsFromBlockId = (
  blockId: string,
): readonly (readonly [string, string])[] => {
  if (!/^aui:\d+:/.test(blockId)) return [];
  const mappingStart = blockId.indexOf(":", 4);
  if (mappingStart === -1) return [];
  try {
    const parsed: unknown = JSON.parse(blockId.slice(mappingStart + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): (readonly [string, string])[] =>
      Array.isArray(entry) &&
      typeof entry[0] === "string" &&
      typeof entry[1] === "string"
        ? [[entry[0], entry[1]]]
        : [],
    );
  } catch {
    return [];
  }
};

const stateFieldValue = (value: unknown): unknown => {
  if (!isRecord(value)) return undefined;
  if (value["type"] === "plain_text_input") {
    return typeof value["value"] === "string" ? value["value"] : undefined;
  }
  return selectedValue(value);
};

const fieldValuesFromState = (
  stateValues: unknown,
): Record<string, unknown> => {
  const fields: Record<string, unknown> = Object.create(null);
  if (!isRecord(stateValues)) return fields;
  for (const [blockId, rawBlockValues] of Object.entries(stateValues)) {
    if (!isRecord(rawBlockValues)) continue;
    for (const [actionId, name] of fieldMappingsFromBlockId(blockId)) {
      if (!Object.hasOwn(rawBlockValues, actionId)) continue;
      const value = stateFieldValue(rawBlockValues[actionId]);
      if (value === undefined) continue;
      Object.defineProperty(fields, name, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  return fields;
};

/**
 * Decodes one structural entry from a Slack `block_actions` payload.
 * `$input` is reserved for the runtime selection: a `$input` key inside the
 * button's JSON `value` payload is dropped rather than spread into the result.
 * `stateValues` is the companion `state.values` object used to resolve named
 * control values referenced by `{ "$field": name }` in the action payload.
 */
export function decodeBlockAction(
  action: unknown,
  stateValues?: unknown,
): Action | undefined {
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
        if (isRecord(parsed)) {
          payload = parsed;
        } else {
          plainValue = rawValue;
        }
      } catch {
        plainValue = rawValue;
      }
    }

    const input = selectedValue(action) ?? plainValue;

    const decoded = {
      ...Object.fromEntries(
        Object.entries(payload).filter(([key]) => key !== "$input"),
      ),
      type: actionId,
      ...(input !== undefined ? { $input: input } : {}),
    };
    return resolveFieldReferences(
      decoded,
      fieldValuesFromState(stateValues),
    ) as Action;
  } catch {
    return undefined;
  }
}
