import {
  resolveSpec,
  type ActionBinding,
  type ResolvedElement,
  type Spec,
} from "generative-frame/spec";
import type { Action, UIElement, UISpec } from "../ir";
import { BOUND_VALUE_PROPS, vocabularyEvents } from "./wiring";

/** Options for {@link specToUISpec}. */
export type SpecToUISpecOptions = {
  /** The state to show the spec in, such as a store's `getState()` after the user's changes. Defaults to `spec.state`. */
  state?: unknown;
};

type Conversion = { spec: Spec; fields: Map<string, string> };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalize = (path: string) =>
  path === "" || path.startsWith("/") ? path : `/${path}`;

const escapeToken = (key: string) =>
  key.replaceAll("~", "~0").replaceAll("/", "~1");

const unescapeToken = (token: string) =>
  token.replaceAll("~1", "/").replaceAll("~0", "~");

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

function collectFields(
  spec: Spec,
  element: ResolvedElement,
  fields: Map<string, string>,
) {
  const path = boundPath(element);
  if (path !== undefined && !fields.has(path)) {
    fields.set(path, fieldName(spec, element, path));
  }
  for (const child of element.children) collectFields(spec, child, fields);
}

// A name that several bound paths share, such as a static `name` on a control repeated per item, cannot tell them apart, so each of those controls is named by its path instead, numbered if that still collides.
function boundFields(spec: Spec, root: ResolvedElement) {
  const fields = new Map<string, string>();
  collectFields(spec, root, fields);
  const uses = new Map<string, number>();
  for (const name of fields.values()) uses.set(name, (uses.get(name) ?? 0) + 1);
  for (const [path, name] of fields) {
    if (uses.get(name)! > 1) fields.set(path, path);
  }
  const taken = new Set<string>();
  for (const [path, name] of fields) {
    let unique = name;
    for (let n = 2; taken.has(unique); n++) unique = `${name}#${n}`;
    taken.add(unique);
    fields.set(path, unique);
  }
  return fields;
}

/** The state path a read in an action param stands for, in the order the renderer resolves its keys. */
function readPath(
  raw: Record<string, unknown>,
  itemPath: string | undefined,
): string | undefined {
  for (const key of ["$state", "$bindState"]) {
    if (key in raw) {
      const path = raw[key];
      return typeof path === "string" ? normalize(path) : undefined;
    }
  }
  for (const key of ["$item", "$bindItem"]) {
    if (key in raw) {
      const field = raw[key];
      if (itemPath === undefined || typeof field !== "string") return undefined;
      return field ? `${itemPath}${normalize(field)}` : itemPath;
    }
  }
  return undefined;
}

/**
 * The resolved `value` of a read of `path`, with each bound control at or
 * under `path` read through `$field` when the action runs and its value now
 * as the fallback. A control can bind a path the state does not hold yet,
 * such as a field of an empty or `null` form, so its key is added.
 */
function overlay(
  value: unknown,
  path: string,
  fields: Map<string, string>,
): unknown {
  const name = fields.get(path);
  if (name !== undefined) {
    return value === undefined
      ? { $field: name }
      : { $field: name, fallback: value };
  }
  const below = [...fields.keys()].filter((bound) =>
    bound.startsWith(`${path}/`),
  );
  if (below.length === 0) return value;
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      overlay(item, `${path}/${index}`, fields),
    );
  }
  if (value !== undefined && value !== null && !isRecord(value)) return value;
  const keys = new Set(isRecord(value) ? Object.keys(value) : []);
  for (const bound of below) {
    keys.add(unescapeToken(bound.slice(path.length + 1).split("/")[0]!));
  }
  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      overlay(
        isRecord(value) && Object.hasOwn(value, key) ? value[key] : undefined,
        `${path}/${escapeToken(key)}`,
        fields,
      ),
    ]),
  );
}

/** Walks an action's params as the spec wrote them beside their resolved values, overlaying each read of state. */
function live(
  raw: unknown,
  value: unknown,
  itemPath: string | undefined,
  fields: Map<string, string>,
): unknown {
  if (Array.isArray(raw)) {
    return Array.isArray(value)
      ? raw.map((item, index) => live(item, value[index], itemPath, fields))
      : value;
  }
  if (!isRecord(raw)) return value;
  if (["$cond", "$calc", "$template"].some((key) => key in raw)) return value;
  const path = readPath(raw, itemPath);
  if (path !== undefined) return overlay(value, path, fields);
  if (Object.keys(raw).some((key) => key.startsWith("$")) || !isRecord(value))
    return value;
  return Object.fromEntries(
    Object.keys(raw).map((key) => [
      key,
      live(raw[key], value[key], itemPath, fields),
    ]),
  );
}

const rawBindings = (spec: Spec, id: string, event: string) => {
  const bound = spec.elements[id]?.on?.[event];
  return (Array.isArray(bound) ? bound : [bound]).filter(
    (binding: unknown): binding is ActionBinding =>
      typeof (binding as ActionBinding | null | undefined)?.action === "string",
  );
};

function toNode(element: ResolvedElement, conversion: Conversion): UIElement {
  const { spec, fields } = conversion;
  const events = vocabularyEvents(element.type);
  const actionFor = (event: string): Action | undefined => {
    const resolved = element.on[event] ?? [];
    const index = resolved.findIndex((entry) => entry.action !== "setState");
    if (index === -1) return undefined;
    const raw = rawBindings(spec, element.id, event)[index]?.params ?? {};
    const params = live(
      raw,
      resolved[index]!.params,
      element.itemPath,
      fields,
    ) as Record<string, unknown>;
    return {
      ...Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined),
      ),
      type: resolved[index]!.action,
    };
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
      ? {
          children: element.children.map((child) => toNode(child, conversion)),
        }
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
 * `$bindItem`, which differs per item; controls that would share a name are
 * named by their state paths. A param that reads a bound control's
 * state, through `$state` or through `$item` inside a `repeat`, becomes a
 * `{ $field }` reference to that control with its value now as the
 * `fallback`, so the action reads what the user entered, and a param that
 * reads a path above bound controls, such as a whole form object or a list
 * item, carries such a reference in each control's place. A param that reads
 * `$event` is left out, since the platform passes what the event carries as
 * `$input`. `watch` and named slots have no equivalent and are left out.
 */
export function specToUISpec(
  spec: Spec,
  options: SpecToUISpecOptions = {},
): UISpec {
  const resolved = resolveSpec(spec, options);
  if (!resolved) return [];
  return toNode(resolved, { spec, fields: boundFields(spec, resolved) });
}
