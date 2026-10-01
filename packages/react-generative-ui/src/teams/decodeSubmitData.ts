import { resolveFieldReferences } from "../fieldReferences";
import type { Action } from "../ir";
import {
  classifyTemporal,
  fromOffsetDateTime,
  mergeTemporalMinutes,
} from "../temporal";
import { decodeTemporalInputId, TEMPORAL_INPUT_PREFIX } from "./temporalId";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Decodes the merged `activity.value` object a Teams bot receives on
 * Action.Submit, inverting the `aui` envelope {@link buildSubmitAction} nests
 * the resume action under. Adaptive Cards fold every other same-card input's
 * value into the same submit object keyed by its `id`, so every top-level key
 * besides `aui` is collected into `$input` (omitted when there are none).
 * Each `{ "$field": name }` reference inside the payload resolves to the
 * same-card input value with that id, as the string Adaptive Cards submitted,
 * and a reference with no such input resolves to its `fallback`, or is dropped
 * without one.
 * `aui` is reserved for the envelope: `toAdaptiveCard` renames any input
 * whose id would collide to an unused id derived from it before encoding, so
 * a same-card input value can never land on this key. `$input` and `type`
 * are reserved on the way out: a `$input` key inside the envelope payload is
 * dropped so the slot only ever reflects same-card input values, and the
 * envelope's own `type` wins over a payload key of the same name. Every
 * collected key (in `payload` or `$input`) is kept as an own data property of
 * the returned object, even a `__proto__` or `constructor` key, since the
 * object is always built by spreading and `Object.fromEntries` rather than by
 * keyed assignment. Envelope keys are read as own properties only, so
 * prototype-inherited `aui`, `type`, or `payload` values never dispatch.
 * Returns `undefined` for a missing or malformed `aui` envelope; never throws.
 */
export function decodeSubmitData(value: unknown): Action | undefined {
  try {
    if (!isRecord(value) || !Object.hasOwn(value, "aui")) return undefined;
    const aui = value["aui"];
    if (
      !isRecord(aui) ||
      !Object.hasOwn(aui, "type") ||
      typeof aui["type"] !== "string"
    ) {
      return undefined;
    }
    const type = aui["type"];

    const payload =
      Object.hasOwn(aui, "payload") && isRecord(aui["payload"])
        ? aui["payload"]
        : {};
    const payloadEntries = Object.entries(payload).filter(
      ([key]) => key !== "$input",
    );
    const inputEntries = Object.entries(value).filter(([key]) => key !== "aui");
    const input = Object.fromEntries(inputEntries);
    const temporalFields = new Set<string>();
    for (const [id, time] of inputEntries) {
      if (!id.startsWith(TEMPORAL_INPUT_PREFIX)) continue;
      const metadata = decodeTemporalInputId(id);
      if (
        !metadata ||
        temporalFields.has(metadata.dateId) ||
        !Object.hasOwn(input, metadata.dateId)
      )
        return undefined;
      const date = input[metadata.dateId];
      if (
        typeof date !== "string" ||
        typeof time !== "string" ||
        (date !== "" && classifyTemporal(date).kind !== "date") ||
        (time !== "" && classifyTemporal(time).kind !== "time")
      )
        return undefined;
      temporalFields.add(metadata.dateId);
      Object.defineProperty(input, metadata.dateId, {
        value: fromOffsetDateTime(
          mergeTemporalMinutes(date, time),
          metadata.previousValue,
        ),
        enumerable: true,
        configurable: true,
        writable: true,
      });
      delete input[id];
    }
    const hasInput = inputEntries.length > 0;

    return {
      ...(resolveFieldReferences(
        Object.fromEntries(payloadEntries),
        input,
      ) as Record<string, unknown>),
      type,
      ...(hasInput ? { $input: input } : {}),
    };
  } catch {
    return undefined;
  }
}
