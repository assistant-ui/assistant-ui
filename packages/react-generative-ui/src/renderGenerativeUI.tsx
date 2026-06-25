import { getPartialJsonObjectMeta } from "assistant-stream/utils";
import { Fragment, type ReactNode } from "react";
import {
  normalizeUINode,
  type NormalizedUIElement,
  type NormalizedUINode,
} from "./ir";
import type { GenerativeUILibrary, GenerativeUIRenderContext } from "./types";

const DEFAULT_CONTEXT: GenerativeUIRenderContext = { status: "done" };

const isElement = (node: NormalizedUINode): node is NormalizedUIElement =>
  typeof node === "object" && node !== null && !Array.isArray(node);

/**
 * Renders a generative-ui tree against a {@link GenerativeUILibrary}.
 *
 * The model emits each node as a flat object `{ $type, ...props }`. We first
 * normalize that wire form into the canonical {@link NormalizedUINode} (with
 * `children` lifted to a reserved top-level key), then render: each `type` is
 * looked up in the library and its `props` are passed to the component's
 * `render(props, context)`, with `children` rendered recursively so components
 * can nest.
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
  return renderNode(normalizeUINode(node, partialPath), library, context);
}

function renderNode(
  node: NormalizedUINode,
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
  return isElement(node) ? renderElement(node, library, context) : null;
}

function renderElement(
  element: NormalizedUIElement,
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

  // `children` is a reserved top-level key on the normalized element, not a
  // prop, so it is not in `props`. Inject the framework props last so the model
  // can never override them.
  const props: Record<string, unknown> = {
    ...element.props,
    $status: context.status,
  };
  if (element.children !== undefined) {
    props["children"] = renderNode(element.children, library, context);
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
function nodeKind(node: NormalizedUINode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return "#text";
  if (Array.isArray(node)) return "#array";
  return isElement(node) ? node.type : "";
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
