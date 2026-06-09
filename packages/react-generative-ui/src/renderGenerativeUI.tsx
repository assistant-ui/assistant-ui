import { getPartialJsonObjectMeta } from "assistant-stream/utils";
import { Fragment, type ReactNode } from "react";
import { TYPE_KEY } from "./constants";
import type {
  GenerativeUIElement,
  GenerativeUILibrary,
  GenerativeUINode,
  GenerativeUIRenderContext,
} from "./types";

const DEFAULT_CONTEXT: GenerativeUIRenderContext = { status: "done" };

/**
 * Renders a generative-ui tree against a {@link GenerativeUILibrary}.
 *
 * The model emits each node as a flat object `{ $type, ...props }`. We first
 * normalize that wire form into React-shaped elements (`{ type, props }`), then
 * render: each `type` is looked up in the library and its `props` are passed
 * to the component's `render(props, context)`, with `children` rendered
 * recursively so components can nest.
 */
export function renderGenerativeUI(
  node: unknown,
  library: GenerativeUILibrary,
  context: GenerativeUIRenderContext = DEFAULT_CONTEXT,
): ReactNode {
  // Tool args are parsed incrementally, and the parse meta records which path
  // is still mid-arrival, so normalization can hold back a node whose `$type`
  // string has not finished streaming.
  const meta = getPartialJsonObjectMeta(node as Record<symbol, unknown>);
  const partialPath = meta?.state === "partial" ? meta.partialPath : undefined;
  return renderNode(normalizeNode(node, partialPath), library, context);
}

/**
 * The deepest tree we normalize. The input comes from the model, so a runaway
 * or adversarial response could nest arbitrarily deep and overflow the stack;
 * past this depth we stop (far beyond any real UI). Bounding normalization
 * bounds rendering too, since it only walks the normalized tree.
 */
const MAX_DEPTH = 64;

/**
 * Converts the flat wire form into a normalized {@link GenerativeUINode}.
 *
 * `partialPath` is the remaining segment of the parse meta's partial path
 * relative to `node` (`undefined` once the walk leaves the partial frontier,
 * i.e. everything below is complete).
 */
function normalizeNode(
  node: unknown,
  partialPath: readonly string[] | undefined,
  depth = 0,
): GenerativeUINode {
  if (depth > MAX_DEPTH) return null;
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node))
    return node.map((child, index) =>
      normalizeNode(child, descend(partialPath, String(index)), depth + 1),
    );
  if (typeof node !== "object") return null;

  const { [TYPE_KEY]: type, ...props } = node as Record<string, unknown>;
  // Args stream in incrementally; a node whose `$type` has not arrived yet
  // (or whose `$type` string is still mid-arrival) is not an error, it just
  // isn't renderable.
  if (typeof type !== "string") return null;
  if (partialPath?.length === 1 && partialPath[0] === TYPE_KEY) return null;

  if ("children" in props) {
    props["children"] = normalizeNode(
      props["children"],
      descend(partialPath, "children"),
      depth + 1,
    );
  }
  return { type, props } as GenerativeUIElement;
}

/** Steps the partial path down into `key`; siblings of the path are complete. */
function descend(
  partialPath: readonly string[] | undefined,
  key: string,
): readonly string[] | undefined {
  return partialPath?.[0] === key ? partialPath.slice(1) : undefined;
}

function renderNode(
  node: GenerativeUINode,
  library: GenerativeUILibrary,
  context: GenerativeUIRenderContext,
): ReactNode {
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node)) {
    // The wire format has no per-node id, so the key is positional. Pairing the
    // index with the node's kind means that when the model splices or reorders
    // `children` and the kind at an index changes, the key changes and React
    // remounts instead of handing a streaming node's hook state to a different
    // component.
    return node.map((child, index) => (
      <Fragment key={`${index}:${nodeKind(child)}`}>
        {renderNode(child, library, context)}
      </Fragment>
    ));
  }
  return renderElement(node, library, context);
}

function renderElement(
  element: GenerativeUIElement,
  library: GenerativeUILibrary,
  context: GenerativeUIRenderContext,
): ReactNode {
  const entry = library[element.type];
  if (!entry) {
    reportUnknownComponent(element.type, Object.keys(library));
    return null;
  }

  // Components that opt out of prop streaming wait until their props are
  // complete rather than rendering from a partial parse.
  if (!entry.streamProperties && context.status === "streaming") return null;

  // Inject the framework props last so the model can never override them.
  const { children, ...rest } = element.props;
  const props: Record<string, unknown> = { ...rest, $status: context.status };
  if (children !== undefined) {
    props["children"] = renderNode(children, library, context);
  }

  return <GenerativeUIComponentRenderer render={entry.render} props={props} />;
}

/**
 * Mounts a single node's `render` on its own fiber so the function may use
 * hooks and hold state independently of its siblings and parent.
 */
function GenerativeUIComponentRenderer({
  render,
  props,
}: {
  render: (props: any) => ReactNode;
  props: Record<string, unknown>;
}): ReactNode {
  return render(props);
}

/** A coarse kind tag for a child, used in its list key so a node changing kind
 * at a given index forces a remount rather than a wrong-fiber reuse. */
function nodeKind(node: GenerativeUINode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return "#text";
  if (Array.isArray(node)) return "#array";
  return node.type;
}

function reportUnknownComponent(type: string, available: string[]): void {
  if (process.env["NODE_ENV"] !== "production") {
    // eslint-disable-next-line no-console
    console.error(
      `[@assistant-ui/react-generative-ui] Unknown component "${type}". ` +
        `Available components: ${available.join(", ") || "(none)"}.`,
    );
  }
}
