import type { Action } from "../ir";
import { resolveFieldReferences } from "../fieldReferences";
import {
  formatTemporalUnixSeconds,
  mergeTemporalMinutes,
  splitTemporalMinutes,
} from "../temporal";
import type { FieldMapping } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionValue = (value: unknown): string | undefined =>
  isRecord(value) && typeof value["value"] === "string"
    ? value["value"]
    : undefined;

const selectedValue = (
  action: Record<string, unknown>,
  field?: FieldMapping,
): unknown => {
  if (action["type"] === "datetimepicker" || "selected_date_time" in action) {
    const seconds = action["selected_date_time"];
    return seconds === null
      ? ""
      : typeof seconds === "number"
        ? formatTemporalUnixSeconds(seconds, field?.offset)
        : undefined;
  }
  if (action["type"] === "timepicker" || "selected_time" in action) {
    const time = action["selected_time"];
    if (time === null) return "";
    const parts =
      typeof time === "string" ? splitTemporalMinutes(time) : undefined;
    return parts?.date === undefined ? parts?.time : undefined;
  }
  if (field?.part === "date" && action["selected_date"] === null) return "";
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
    action["type"] === "number_input" && typeof action["value"] === "string"
      ? Number(action["value"])
      : undefined;
  return (
    selectedOption ??
    selectedDate ??
    (selectedOptions !== undefined
      ? selectedOptions
      : Number.isFinite(numberInput)
        ? numberInput
        : undefined)
  );
};

const fieldMappingsFromBlockId = (blockId: string): readonly FieldMapping[] => {
  if (!/^aui:\d+:/.test(blockId)) return [];
  const mappingStart = blockId.indexOf(":", 4);
  if (mappingStart === -1) return [];
  try {
    const parsed: unknown = JSON.parse(blockId.slice(mappingStart + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): FieldMapping[] => {
      if (
        !Array.isArray(entry) ||
        typeof entry[0] !== "string" ||
        typeof entry[1] !== "string"
      )
        return [];
      return [
        {
          actionId: entry[0],
          name: entry[1],
          component: typeof entry[2] === "string" ? entry[2] : "",
          ...(entry[2] === "DatePicker" &&
          (entry[3] === "time" || entry[3] === "datetime")
            ? {
                inputType: entry[3],
                ...(typeof entry[4] === "string" ? { offset: entry[4] } : {}),
                ...((entry[5] === "date" || entry[5] === "time") &&
                Number.isSafeInteger(entry[6]) &&
                entry[6] >= 0
                  ? { part: entry[5], pairId: entry[6] }
                  : {}),
              }
            : {}),
        },
      ];
    });
  } catch {
    return [];
  }
};

const checkboxValue = (
  value: Record<string, unknown>,
  name: string,
): boolean | undefined =>
  Array.isArray(value["selected_options"])
    ? value["selected_options"].some((option) => optionValue(option) === name)
    : undefined;

const stateFieldValue = (value: unknown, field: FieldMapping): unknown => {
  if (!isRecord(value)) return undefined;
  if (field.component === "Checkbox" && value["type"] === "checkboxes") {
    return checkboxValue(value, field.name);
  }
  if (value["type"] === "plain_text_input") {
    return typeof value["value"] === "string" ? value["value"] : undefined;
  }
  return selectedValue(value, field);
};

const fieldValuesFromState = (
  stateValues: unknown,
  action: Record<string, unknown>,
  actionField: FieldMapping | undefined,
) => {
  const fields: Record<string, unknown> = Object.create(null);
  const pairs = new Map<number, { name: string; date: string; time: string }>();
  const collect = (raw: unknown, field: FieldMapping) => {
    const value = stateFieldValue(raw, field);
    if (field.part !== undefined && field.pairId !== undefined) {
      const pair = pairs.get(field.pairId) ?? {
        name: field.name,
        date: "",
        time: "",
      };
      pair[field.part] = typeof value === "string" ? value : "";
      pairs.set(field.pairId, pair);
    } else if (field.name && value !== undefined) {
      fields[field.name] = value;
    }
  };
  if (isRecord(stateValues)) {
    for (const [blockId, rawBlockValues] of Object.entries(stateValues)) {
      if (!isRecord(rawBlockValues)) continue;
      for (const field of fieldMappingsFromBlockId(blockId)) {
        if (Object.hasOwn(rawBlockValues, field.actionId))
          collect(rawBlockValues[field.actionId], field);
      }
    }
  }
  if (actionField?.inputType !== undefined) collect(action, actionField);
  for (const pair of pairs.values()) {
    if (pair.name)
      fields[pair.name] = mergeTemporalMinutes(pair.date, pair.time);
  }
  return { fields, pairs };
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

    const actionField =
      typeof action["block_id"] === "string"
        ? fieldMappingsFromBlockId(action["block_id"]).find(
            (field) => field.actionId === actionId,
          )
        : undefined;
    const { fields, pairs } = fieldValuesFromState(
      stateValues,
      action,
      actionField,
    );
    let input = selectedValue(action, actionField) ?? plainValue;
    if (actionField?.pairId !== undefined) {
      const pair = pairs.get(actionField.pairId);
      input =
        pair === undefined ? "" : mergeTemporalMinutes(pair.date, pair.time);
      if (!input) return undefined;
    }
    if (
      (action["type"] === "timepicker" ||
        action["type"] === "datetimepicker") &&
      input === undefined
    )
      return undefined;

    const decoded = {
      ...Object.fromEntries(
        Object.entries(payload).filter(([key]) => key !== "$input"),
      ),
      type: actionId,
      ...(input !== undefined ? { $input: input } : {}),
    };
    return resolveFieldReferences(decoded, fields) as Action;
  } catch {
    return undefined;
  }
}
