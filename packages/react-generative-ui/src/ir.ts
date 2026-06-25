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

/** Text size token shared by `Text` and `Header`-style nodes. */
export type TextSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

/** Image size token, or a pixel value. */
export type ImageSize = "sm" | "md" | "lg" | number;

/** Font weight token. */
export type Weight = "normal" | "medium" | "semibold" | "bold";

/** Foreground color token. */
export type Color =
  | "emphasis"
  | "secondary"
  | "alpha-70"
  | "white"
  | "white-70"
  | "white-50";

/** Cross-axis alignment token. */
export type Align = "start" | "center" | "end";

/** Main-axis distribution token. */
export type Justify = "start" | "center" | "end" | "between";

/** Button style token. */
export type ButtonStyle =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

/** Alert severity tone. Maps to ChatKit `alert` severity levels. */
export type AlertTone = "info" | "success" | "warning" | "danger";

/**
 * A behavior payload carried by an interactive node. `type` is resolved by the
 * host's action registry, not by the renderer. It rides on the reserved
 * `$action` key (see {@link UIElement}). Keeping behavior as data keeps the
 * tree serializable so the same node renders on web and converts to a native
 * action id on Slack.
 */
export interface Action {
  readonly type: string;
  readonly [payload: string]: unknown;
}

/**
 * Anything renderable as generative UI, as the model emits it: a text leaf or
 * an element (flat `$type` or legacy `component` shape). The renderer also
 * accepts `number`, `boolean`, `null`, `undefined`, and arrays at the input
 * boundary (numbers render as text, falsy/boolean as nothing, arrays as
 * lists); {@link normalizeUINode} accepts that full range and returns the
 * canonical {@link NormalizedUINode}.
 */
export type UINode = string | number | UIElement | LegacyComponentNode;

/** Nested UI, a single node or a list. Reserved (JSX convention). */
export type UIChildren = UINode | readonly UINode[];

/**
 * The flat node shape. Inline props keep the tree compact and natural for a
 * model to emit. `$type` selects the component; `$key` carries list identity;
 * `$action` carries behavior as data; `children` nests. The renderer strips the
 * reserved keys before handing props to the component.
 */
export interface UIElement {
  /** Component name, resolved against the consumer registry. Reserved. */
  readonly $type: string;
  /** Stable key for React reconciliation and streaming re-orders. Reserved. */
  readonly $key?: string | number;
  /** Nested UI rendered inside this element. Reserved (JSX convention). */
  readonly children?: UIChildren;
  /** Behavior payload (see {@link Action}). Reserved. */
  readonly $action?: Action;
  /** Inline props passed to the resolved component (never `$`-prefixed). */
  readonly [prop: string]: unknown;
}

/**
 * The legacy node shape: a `component` name plus a nested `props` bag. Kept
 * for backward compatibility. New code authors the flat {@link UIElement}
 * shape instead.
 */
export interface LegacyComponentNode {
  /** Allowlisted component name (resolved against the consumer registry). */
  readonly component: string;
  /** Props passed to the resolved component (must be JSON-serializable). */
  readonly props?: Record<string, unknown>;
  /** Optional children; strings render as text, objects recurse. */
  readonly children?: UIChildren;
  /** Optional stable key for React reconciliation. */
  readonly key?: string;
}

/** A root or a list of roots. */
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

/**
 * The deepest tree we normalize. The input comes from the model, so a runaway
 * or adversarial response could nest arbitrarily deep and overflow the stack;
 * past this depth we stop (far beyond any real UI). Bounding normalization
 * bounds rendering too, since it only walks the normalized tree.
 */
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
 * Normalizes a generative-ui input to {@link NormalizedUINode}.
 *
 * Accepts the full renderer input range: the flat `$type` shape, the legacy
 * `component` shape, string/number text leaves, arrays, and falsy/boolean
 * values (which resolve to `null`). The flat `$type` shape and the legacy
 * `component` shape both map to the same canonical element. Reserved keys
 * (`$type`, `$key`, `$action`, `children`) are stripped from the component prop
 * bag, so the component never sees them. A node that carries neither a `$type`
 * nor a `component` string is not renderable and resolves to `null` rather than
 * throwing, so a partially-streamed or malformed node degrades to
 * "render nothing".
 *
 * `partialPath` carries streaming state from the tool-args parse meta: a node
 * whose `$type` string is still mid-arrival is held back (resolves to `null`)
 * until it completes, and the path is threaded into `children` so a nested
 * streaming node is held back while its completed siblings render. Omit it for
 * a non-streaming (converter) normalize.
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

  if (isLegacyNode(node)) {
    const props = (node.props ?? {}) as Record<string, unknown>;
    const key = node.key as string | undefined;
    return {
      type: node.component,
      props,
      children: normalizeChildren(node.children, partialPath, depth),
      key,
    };
  }

  if (isTypeNode(node)) {
    // A node whose `$type` has not arrived yet (or whose `$type` string is
    // still mid-arrival) is not an error, it just isn't renderable.
    if (partialPath?.length === 1 && partialPath[0] === TYPE_KEY) return null;
    const { $type, $key, $action, children, ...props } = node;
    return {
      type: $type,
      props,
      children: normalizeChildren(children, partialPath, depth),
      key: $key,
      action: $action,
    };
  }

  return null;
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
