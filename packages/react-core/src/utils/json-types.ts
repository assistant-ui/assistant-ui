// Minimal JSON read-only types used by assistant-stream
export type ReadonlyJSONPrimitive = string | number | boolean | null;
export type ReadonlyJSONArray = readonly ReadonlyJSONValue[];
export type ReadonlyJSONObject = { readonly [key: string]: ReadonlyJSONValue };
export type ReadonlyJSONValue =
  | ReadonlyJSONPrimitive
  | ReadonlyJSONArray
  | ReadonlyJSONObject;
