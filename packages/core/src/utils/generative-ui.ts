import type {
  GenerativeUIAction,
  GenerativeUIComponentNode,
  GenerativeUINode,
  GenerativeUISpec,
  GenerativeUITypeNode,
} from "../types/message";

/**
 * A node normalized to a single canonical shape: a `type` string, an inline
 * `props` bag, recursive `children`, an optional `key`, and an optional
 * `action`. Renderers and platform converters consume this form, so they never
 * branch on whether the model emitted the flat `$type` shape or the legacy
 * `component` shape, and they never see the reserved `$`-prefixed keys leak
 * into component props.
 */
export type NormalizedUIElement = {
  readonly type: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children?: readonly NormalizedUINode[] | undefined;
  readonly key?: string | number | undefined;
  readonly action?: GenerativeUIAction | undefined;
};

export type NormalizedUINode = string | NormalizedUIElement | null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isComponentNode = (
  node: Record<string, unknown>,
): node is GenerativeUIComponentNode => typeof node["component"] === "string";

const isTypeNode = (
  node: Record<string, unknown>,
): node is GenerativeUITypeNode => typeof node["$type"] === "string";

function normalizeChildren(
  children: readonly GenerativeUINode[] | undefined,
): readonly NormalizedUINode[] | undefined {
  if (children === undefined) return undefined;
  return children.map((child) => normalizeUINode(child));
}

/**
 * Normalizes a {@link GenerativeUINode} to {@link NormalizedUINode}.
 *
 * The flat `$type` shape and the legacy `component` shape both map to the same
 * canonical element. Reserved keys (`$type`, `$key`, `$action`, `children`)
 * are stripped from the component prop bag, so the component never sees them.
 * A node that carries neither a `$type` nor a `component` string is not
 * renderable and resolves to `null` rather than throwing, so a
 * partially-streamed or malformed node degrades to "render nothing".
 */
export function normalizeUINode(node: GenerativeUINode): NormalizedUINode {
  if (typeof node === "string") return node;

  if (!isRecord(node)) return null;

  if (isComponentNode(node)) {
    return {
      type: node.component,
      props: node.props ?? {},
      children: normalizeChildren(node.children),
      key: node.key,
    };
  }

  if (isTypeNode(node)) {
    const { $type, $key, $action, children, ...props } = node;
    return {
      type: $type,
      props,
      children: normalizeChildren(children),
      key: $key,
      action: $action,
    };
  }

  return null;
}

/**
 * Normalizes the root of a {@link GenerativeUISpec}, preserving whether the
 * root was a single node or a list.
 */
export function normalizeSpec(spec: GenerativeUISpec): {
  readonly root: NormalizedUINode | readonly NormalizedUINode[];
} {
  const { root } = spec;
  if (Array.isArray(root)) {
    const nodes = root as readonly GenerativeUINode[];
    return { root: nodes.map((node) => normalizeUINode(node)) };
  }
  return { root: normalizeUINode(root as GenerativeUINode) };
}
