/**
 * The key naming the component to render.
 *
 * Nodes are flat objects `{ [TYPE_KEY]: name, ...props }`. We use `$type`
 * rather than `type` so a component's own `type` prop (e.g. a button's
 * `type="submit"`) flows through as an ordinary prop without colliding with
 * the discriminator. It mirrors the `$type` discriminator convention used by
 * JSON polymorphism elsewhere. Models emit the same key as `_type`, which
 * normalizes identically.
 */
export const TYPE_KEY = "$type";

/**
 * The reserved node keys as the `present` tool schema names them for models.
 * Anthropic rejects tool schema property names outside
 * `^[a-zA-Z0-9_.-]{1,64}$`, so the model-facing keys trade the `$` prefix for
 * `_`.
 */
export const MODEL_KEYS = {
  type: "_type",
  key: "_key",
  action: "_action",
} as const;

const MODEL_KEY_NAMES: ReadonlySet<string> = new Set(Object.values(MODEL_KEYS));

/** Whether a node key is framework-reserved rather than a component prop. */
export const isReservedKey = (key: string): boolean =>
  key.startsWith("$") || MODEL_KEY_NAMES.has(key);

/** Reads a reserved node key in either spelling, preferring the `$` one. */
export const readReserved = (
  node: Readonly<Record<string, unknown>>,
  name: keyof typeof MODEL_KEYS,
): unknown => node[`$${name}`] ?? node[MODEL_KEYS[name]];

export const GENERATED_NAME_ATTR = "data-aui-generated-name";

export const FIELD_NAME_ATTR = "data-aui-field-name";
export const FIELD_VALUE_ATTR = "data-aui-field-value";

export const CHECKBOX_GROUP_ATTR = "data-aui-checkbox-group";
