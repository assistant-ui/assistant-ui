/**
 * The wire key naming the component to render.
 *
 * The model emits nodes as flat objects `{ [TYPE_KEY]: name, ...props }`. We
 * use `$type` rather than `type` so a component's own `type` prop (e.g. a
 * button's `type="submit"`) flows through as an ordinary prop without
 * colliding with the discriminator. It mirrors the `$type` discriminator
 * convention used by JSON polymorphism elsewhere.
 */
export const TYPE_KEY = "$type";

export const GENERATED_NAME_ATTR = "data-aui-generated-name";

export const FIELD_NAME_ATTR = "data-aui-field-name";

export const CHECKBOX_GROUP_ATTR = "data-aui-checkbox-group";
