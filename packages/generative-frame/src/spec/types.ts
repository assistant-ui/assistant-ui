/** Runs a catalog action, or the built-in `setState`, when an element emits an event. */
export type ActionBinding = {
  action: string;
  params?: Record<string, unknown>;
};

/**
 * A visibility condition: a boolean, a value expression (truthy test), a
 * comparison (`{ $state: "/x", gt: 3 }`), `{ not: condition }`,
 * `{ $and: [...] }`, `{ $or: [...] }`, or an array (all must hold).
 */
export type Condition =
  | boolean
  | readonly Condition[]
  | { readonly [key: string]: unknown };

/** One node of a spec. Children are referenced by element id. */
export type SpecElement = {
  type: string;
  props?: Record<string, unknown>;
  /** Ids of the elements in the component's default slot. */
  children?: string[];
  /** Ids per named slot, for components that declare more than `default`. */
  slots?: Record<string, string[]>;
  /** Renders the element only while the condition holds. */
  visible?: Condition;
  /** Renders the children once per item of the array at `path` in state. */
  repeat?: { path: string; key?: string };
  /** Actions to run when the component emits an event, keyed by event name. */
  on?: Record<string, ActionBinding | ActionBinding[]>;
  /** Actions to run when the state value at a path changes, keyed by JSON Pointer. */
  watch?: Record<string, ActionBinding | ActionBinding[]>;
};

/** A flat spec: the root element id, every element by id, and initial state. */
export type Spec = {
  root: string;
  elements: Record<string, SpecElement>;
  state?: Record<string, unknown>;
};

/** One RFC 6902 operation. Paths are JSON Pointers into the spec. */
export type PatchOperation =
  | { op: "add"; path: string; value: unknown }
  | { op: "replace"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "move"; from: string; path: string }
  | { op: "copy"; from: string; path: string }
  | { op: "test"; path: string; value: unknown };

export const emptySpec = (): Spec => ({ root: "", elements: {}, state: {} });
