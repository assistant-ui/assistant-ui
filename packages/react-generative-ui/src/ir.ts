/**
 * The generative-ui intermediate representation: a model-emitted, cross-platform
 * UI tree. React-free, so converters and non-web runtimes consume it without
 * pulling React. The flat `$type` shape is the canonical form; the legacy
 * `component` shape is accepted as a backward-compatible alias.
 *
 * Reserved keys are partitioned off from component props so the component prop
 * namespace stays fully free:
 *
 * - `$`-prefixed keys are framework-reserved (`$type`, `$key`, `$action`,
 *   `$status`). Components never declare `$`-prefixed props, so a component
 *   can use `type`, `status`, `variant`, etc. as ordinary props without
 *   colliding with the framework.
 * - `children` is additionally reserved (the JSX convention).
 * - every other key is an inline prop passed straight to the component.
 */

import { TYPE_KEY } from "./constants";

export const TEXT_SIZES = ["sm", "md", "lg", "xl", "2xl", "3xl"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const IMAGE_SIZE_TOKENS = ["sm", "md", "lg"] as const;
export type ImageSize = (typeof IMAGE_SIZE_TOKENS)[number] | number;

export const WEIGHTS = ["normal", "medium", "semibold", "bold"] as const;
export type Weight = (typeof WEIGHTS)[number];

export const COLORS = [
  "emphasis",
  "secondary",
  "alpha-70",
  "white",
  "white-70",
  "white-50",
] as const;
export type Color = (typeof COLORS)[number];

export const ALIGNS = ["start", "center", "end"] as const;
export type Align = (typeof ALIGNS)[number];

export const JUSTIFIES = ["start", "center", "end", "between"] as const;
export type Justify = (typeof JUSTIFIES)[number];

export const BUTTON_STYLES = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

export const ALERT_TONES = ["info", "success", "warning", "danger"] as const;
/** A severity level, from informational to destructive. */
export type AlertTone = (typeof ALERT_TONES)[number];

/**
 * Behavior payload carried by an interactive node. `type` is resolved by the host's action registry, not the renderer; keeping behavior as data keeps the tree serializable, so the same node renders on web while converters may bind the type to a native action id on other platforms.
 */
export interface Action {
  readonly type: string;
  readonly [payload: string]: unknown;
}

/**
 * Anything renderable as generative UI, as the model emits it. The renderer
 * also accepts `number`, `boolean`, `null`, `undefined`, and arrays at the
 * input boundary (numbers render as text, falsy/boolean as nothing, arrays as
 * lists); {@link normalizeUINode} accepts that full range.
 */
export type UINode = string | number | UIElement | LegacyComponentNode;

export type UIChildren = UINode | readonly UINode[];

/** The flat node shape: inline props keep the tree compact and natural for a
 * model to emit, instead of a nested `{ type, props }` bag. Reserved keys are
 * stripped before props reach the component (see the module header). */
export interface UIElement {
  readonly $type: string;
  readonly $key?: string | number;
  readonly children?: UIChildren;
  readonly $action?: Action;
  readonly [prop: string]: unknown;
}

/**
 * The legacy node shape: a `component` name plus a nested `props` bag. Kept
 * for backward compatibility. New code authors the flat {@link UIElement}
 * shape instead.
 */
export interface LegacyComponentNode {
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly children?: UIChildren;
  readonly key?: string;
}

export type UISpec = UINode | readonly UINode[];

/**
 * A node normalized to a single canonical shape: a `type` string, an inline
 * `props` bag, recursive `children`, an optional `key`, and an optional
 * `action`. Renderers and platform converters consume this form, so they never
 * branch on whether the model emitted the flat `$type` shape or the legacy
 * `component` shape, and they never see the reserved `$`-prefixed keys leak
 * into component props.
 */
export interface NormalizedUIElement {
  readonly type: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children?: NormalizedUINode | undefined;
  readonly key?: string | number | undefined;
  readonly action?: Action | undefined;
}

export type NormalizedUINode =
  | string
  | number
  | readonly NormalizedUINode[]
  | NormalizedUIElement
  | null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type LegacyNodeRecord = { component: string } & Record<string, unknown>;

const isLegacyNode = (
  node: Record<string, unknown>,
): node is LegacyNodeRecord => typeof node["component"] === "string";

const isTypeNode = (node: Record<string, unknown>): node is UIElement =>
  typeof node[TYPE_KEY] === "string";

/** Bounds recursion so a runaway or adversarial model response cannot overflow
 * the stack; past this depth (far beyond any real UI) we stop. */
const MAX_DEPTH = 64;

/**
 * Steps a streaming partial path down into `key`. `partialPath` is the remaining
 * segment of the parse meta's partial path relative to `node` (`undefined` once
 * the walk leaves the partial frontier, i.e. everything below is complete).
 */
function descend(
  partialPath: readonly string[] | undefined,
  key: string,
): readonly string[] | undefined {
  return partialPath?.[0] === key ? partialPath.slice(1) : undefined;
}

/**
 * Normalizes a generative-ui input to {@link NormalizedUINode}. The flat
 * `$type` shape and the legacy `component` shape both map to the same canonical
 * element, with reserved keys (`$type`, `$key`, `$action`, `children`) stripped
 * from the prop bag. A node that carries neither a `$type` nor a `component`
 * string is not renderable and resolves to `null` rather than throwing, so a
 * partially-streamed or malformed node degrades to "render nothing".
 *
 * `partialPath` carries streaming state from the tool-args parse meta: a node
 * whose `$type` is still mid-arrival is held back (resolves to `null`) until it
 * completes, and the path is threaded into `children` so a nested streaming
 * node is held back while completed siblings render. Omit it for a
 * non-streaming (converter) normalize.
 */
export function normalizeUINode(
  node: unknown,
  partialPath?: readonly string[] | undefined,
  depth = 0,
): NormalizedUINode {
  if (depth > MAX_DEPTH) return null;
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node))
    return node.map((child, index) =>
      normalizeUINode(child, descend(partialPath, String(index)), depth + 1),
    );
  if (!isRecord(node)) return null;

  // The flat `$type` shape is the canonical form; detect it first so a flat
  // node that happens to use `component` as an ordinary prop is not swallowed
  // by the legacy `component`-shape branch.
  if (isTypeNode(node)) {
    if (partialPath?.length === 1 && partialPath[0] === TYPE_KEY) return null;
    const { [TYPE_KEY]: type, $key, $action, children, ...rest } = node;
    // The `$`-prefixed namespace is framework-reserved (see the module header),
    // so any model-supplied `$`-prefixed key is stripped from the prop bag the
    // component sees. `$type`/`$key`/`$action` are pulled above; sweep the rest
    // (e.g. a stray `$status`) so it never leaks to converters or components.
    const props = stripReservedProps(rest);
    return {
      type,
      props,
      children: normalizeChildren(children, partialPath, depth),
      key: $key,
      action: $action,
    };
  }

  if (isLegacyNode(node)) {
    const props = stripReservedProps(
      (node.props ?? {}) as Record<string, unknown>,
    );
    return {
      type: node.component,
      props,
      children: normalizeChildren(node.children, partialPath, depth),
      key: node.key as string | undefined,
    };
  }

  return null;
}

function stripReservedProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  let out: Record<string, unknown> | undefined;
  for (const key of Object.keys(props)) {
    if (key.startsWith("$")) {
      out ??= { ...props };
      delete out[key];
    }
  }
  return out ?? props;
}

function normalizeChildren(
  children: unknown,
  partialPath: readonly string[] | undefined,
  depth: number,
): NormalizedUINode | undefined {
  if (children === undefined) return undefined;
  return normalizeUINode(children, descend(partialPath, "children"), depth + 1);
}

/**
 * Normalizes the root of a {@link UISpec}, preserving whether the root was a
 * single node or a list.
 */
export function normalizeSpec(spec: UISpec): {
  readonly root: NormalizedUINode | readonly NormalizedUINode[];
} {
  if (Array.isArray(spec)) {
    return {
      root: (spec as readonly UINode[]).map((node) => normalizeUINode(node)),
    };
  }
  return { root: normalizeUINode(spec) };
}
