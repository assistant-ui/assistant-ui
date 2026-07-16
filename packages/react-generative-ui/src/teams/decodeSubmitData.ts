import type { Action } from "../ir";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Decodes the merged `activity.value` object a Teams bot receives on
 * Action.Submit, inverting the `aui` envelope {@link buildSubmitAction} nests
 * the resume action under. Adaptive Cards fold every other same-card input's
 * value into the same submit object keyed by its `id`, so every top-level key
 * besides `aui` is collected into `$input` (omitted when there are none).
 * `aui` is reserved for the envelope: `toAdaptiveCard` renames any input
 * whose id would collide to `aui_` before encoding, so a same-card input
 * value can never land on this key. `$input` and `type` are reserved on the
 * way out: a `$input` key inside the envelope payload is dropped so the slot
 * only ever reflects same-card input values, and the envelope's own `type`
 * wins over a payload key of the same name. Every collected key (in `payload` or
 * `$input`) is kept as an own data property of the returned object, even a
 * `__proto__` or `constructor` key, since the object is always built by
 * spreading and `Object.fromEntries` rather than by keyed assignment.
 * Returns `undefined` for a missing or malformed `aui` envelope; never throws.
 */
export function decodeSubmitData(value: unknown): Action | undefined {
  try {
    if (!isRecord(value)) return undefined;
    const aui = value["aui"];
    if (!isRecord(aui) || typeof aui["type"] !== "string") return undefined;
    const type = aui["type"];

    const payload = isRecord(aui["payload"]) ? aui["payload"] : {};
    const payloadEntries = Object.entries(payload).filter(
      ([key]) => key !== "$input",
    );
    const inputEntries = Object.entries(value).filter(([key]) => key !== "aui");
    const input =
      inputEntries.length > 0 ? Object.fromEntries(inputEntries) : undefined;

    return {
      ...Object.fromEntries(payloadEntries),
      type,
      ...(input !== undefined ? { $input: input } : {}),
    };
  } catch {
    return undefined;
  }
}
