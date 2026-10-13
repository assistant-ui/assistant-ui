import {
  resolveSpec,
  type ResolvedElement,
  type Spec,
  type SpecElement,
} from "generative-frame/spec";
import { decodeAbsolutePointer } from "../a2ui/pointer";
import type { Action, UIElement, UISpec } from "../ir";
import { BOUND_VALUE_PROPS, vocabularyEvents } from "./wiring";

/** Options for {@link specToUISpec}. */
export type SpecToUISpecOptions = {
  /** The state to show the spec in, such as a store's `getState()` after the user's changes. Defaults to `spec.state`. */
  state?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const statePath = (path: string) =>
  path === "" || path.startsWith("/") ? path : `/${path}`;

const escapeToken = (key: string) =>
  key.replaceAll("~", "~0").replaceAll("/", "~1");

function readState(state: unknown, path: string): unknown {
  let value = state;
  for (const token of decodeAbsolutePointer(path) ?? []) {
    if (typeof value !== "object" || value === null) return undefined;
    if (!Object.hasOwn(value, token)) return undefined;
    value = (value as Record<string, unknown>)[token];
  }
  return value;
}

const boundPath = (element: ResolvedElement) =>
  BOUND_VALUE_PROPS.map(([prop]) => element.bindings[prop]).find(
    (path) => path !== undefined,
  );

// A control repeated per item binds its own path, so that path names it when it has no `name`.
const fieldName = (spec: Spec, element: ResolvedElement, path: string) => {
  if (typeof element.props["name"] === "string") return element.props["name"];
  const raw = BOUND_VALUE_PROPS.map(
    ([prop]) => spec.elements[element.id]?.props?.[prop],
  ).find(isRecord);
  return typeof raw?.["$bindState"] === "string" ? element.id : path;
};

function boundFields(
  spec: Spec,
  element: ResolvedElement,
  fields = new Map<string, string>(),
) {
  const path = boundPath(element);
  if (path !== undefined && !fields.has(path)) {
    fields.set(path, fieldName(spec, element, path));
  }
  for (const child of element.children) boundFields(spec, child, fields);
  return fields;
}

/**
 * A `{ $state }` read rewritten so that each bound control under `path` is
 * read through `$field` when the action runs, with its value now as the
 * fallback. A read of a path above bound controls, such as a whole form
 * object, follows the shape of the state down to them, and every other value
 * stays a `$state` read, which resolves without reinterpreting state data.
 */
function liveRead(
  path: string,
  fields: Map<string, string>,
  state: unknown,
): unknown {
  const name = fields.get(path);
  if (name !== undefined) return { $field: name, fallback: { $state: path } };
  const below = [...fields.keys()].some(
    (bound) => path === "" || bound.startsWith(`${path}/`),
  );
  const value = below ? readState(state, path) : undefined;
  if (Array.isArray(value)) {
    return value.map((_, index) => liveRead(`${path}/${index}`, fields, state));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value).map((key) => [
        key,
        liveRead(`${path}/${escapeToken(key)}`, fields, state),
      ]),
    );
  }
  return { $state: path };
}

function fieldParams(
  value: unknown,
  fields: Map<string, string>,
  state: unknown,
): unknown {
  if (Array.isArray(value))
    return value.map((item) => fieldParams(item, fields, state));
  if (!isRecord(value)) return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && typeof value["$state"] === "string") {
    return liveRead(statePath(value["$state"]), fields, state);
  }
  if (keys.some((key) => key.startsWith("$"))) return value;
  return Object.fromEntries(
    keys.map((key) => [key, fieldParams(value[key], fields, state)]),
  );
}

const withFields = (
  spec: Spec,
  fields: Map<string, string>,
  state: unknown,
): Spec => ({
  ...spec,
  elements: Object.fromEntries(
    Object.entries(spec.elements).map(
      ([id, element]): [string, SpecElement] => [
        id,
        element?.on
          ? {
              ...element,
              on: Object.fromEntries(
                Object.entries(element.on).map(([event, bound]) => [
                  event,
                  (Array.isArray(bound) ? bound : [bound]).map((binding) =>
                    isRecord(binding) && isRecord(binding.params)
                      ? {
                          ...binding,
                          params: fieldParams(
                            binding.params,
                            fields,
                            state,
                          ) as Record<string, unknown>,
                        }
                      : binding,
                  ),
                ]),
              ),
            }
          : element,
      ],
    ),
  ),
});

function toNode(
  element: ResolvedElement,
  fields: Map<string, string>,
): UIElement {
  const events = vocabularyEvents(element.type);
  const actionFor = (event: string): Action | undefined => {
    const bound = element.on[event]?.find(
      (entry) => entry.action !== "setState",
    );
    if (!bound) return undefined;
    const params = Object.entries(bound.params).filter(
      ([, value]) => value !== undefined,
    );
    return { ...Object.fromEntries(params), type: bound.action };
  };
  const props: Record<string, unknown> = { ...element.props };
  for (const event of events) {
    const action = actionFor(event);
    const footer = props[event];
    if (action && isRecord(footer))
      props[event] = { ...footer, $action: action };
  }
  const path = boundPath(element);
  const name = path === undefined ? undefined : fields.get(path);
  if (name !== undefined) props["name"] = name;
  const action = events[0] === undefined ? undefined : actionFor(events[0]);
  return {
    ...props,
    $type: element.type,
    ...(element.key !== undefined
      ? { $key: `${element.key}:${element.id}` }
      : {}),
    ...(element.children.length > 0
      ? { children: element.children.map((child) => toNode(child, fields)) }
      : {}),
    ...(action ? { $action: action } : {}),
  };
}

/**
 * Converts a generative-frame spec into the tree that `toSlackBlocks`,
 * `toAdaptiveCard`, and `generativeUIToJSX` read, showing the spec as the
 * renderer would for one state (see `resolveSpec`). The first event a
 * component emits, and the event a Card footer button emits, become its
 * `$action`: the first action bound to the event other than `setState`, with
 * its resolved params. A control whose value is bound gets a `name` unless it
 * has one: its element id for `$bindState`, or its state path for
 * `$bindItem`, which differs per item. A param that reads a bound path with
 * `{ $state }` becomes a `{ $field }` reference to that control with its value
 * now as the `fallback`, so the action reads what the user entered, and a
 * param that reads a path above bound controls, such as a whole form object,
 * carries such a reference in each control's place. A param that reads
 * `$event` is left out, since the platform passes what the event carries as
 * `$input`. `watch` and named slots have no equivalent and are left out.
 */
export function specToUISpec(
  spec: Spec,
  options: SpecToUISpecOptions = {},
): UISpec {
  const resolved = resolveSpec(spec, options);
  if (!resolved) return [];
  const fields = boundFields(spec, resolved);
  if (fields.size === 0) return toNode(resolved, fields);
  const state =
    options.state === undefined ? (spec.state ?? {}) : options.state;
  const live = resolveSpec(withFields(spec, fields, state), options);
  return live ? toNode(live, fields) : [];
}
