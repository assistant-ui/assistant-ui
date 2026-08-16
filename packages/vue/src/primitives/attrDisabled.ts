// A bare `disabled` template attribute arrives as "", which Boolean() would
// drop; mirror Vue's boolean-attribute semantics instead.
export const isAttrDisabled = (attrs: Record<string, unknown>): boolean =>
  attrs.disabled != null &&
  attrs.disabled !== false &&
  attrs.disabled !== "false";
