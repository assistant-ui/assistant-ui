import { RadioGroupScope } from "./RadioGroupScope";
import { getPartialJsonObjectMeta } from "assistant-stream/utils";
import { Fragment, type ReactNode } from "react";
import { z } from "zod";
import { hasFieldReference, resolveFieldReferences } from "./fieldReferences";
import {
  normalizeUINode,
  type Action,
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
 * `render(props)`, with `children` rendered recursively so components can nest.
 * A prop that several components declare loses a value the component's own
 * schema rejects when another declaring component's schema accepts it, since
 * the merged `present` schema lets the model send either.
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
  const rendered = renderNode(
    normalizeUINode(node, partialPath),
    library,
    withFieldFallbacks(context),
  );
  return rendered !== null && typeof rendered === "object" ? (
    <RadioGroupScope>{rendered}</RadioGroupScope>
  ) : (
    rendered
  );
}

// A component that dispatches `$action` itself reads no control, so each `$field` reference left in it becomes its fallback.
const withFieldFallbacks = (
  context: GenerativeUIRenderContext,
): GenerativeUIRenderContext => {
  const { dispatch } = context;
  if (dispatch === undefined) return context;
  return {
    ...context,
    dispatch: (action) =>
      dispatch(
        hasFieldReference(action)
          ? (resolveFieldReferences(action, {}) as Action)
          : action,
      ),
  };
};

function renderNode(
  node: NormalizedUINode,
  library: GenerativeUILibrary,
  context: GenerativeUIRenderContext,
): ReactNode {
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node)) {
    // Use a model-provided stable key when present. Otherwise, keep the
    // positional fallback: pairing the index with the node's kind means that
    // when the kind at an index changes, React remounts instead of handing a
    // streaming node's hook state to a different component.
    return node.map((child, index) => (
      <Fragment key={nodeKey(child, index)}>
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
  const entry = Object.hasOwn(library, element.type)
    ? library[element.type]
    : undefined;
  if (!entry) {
    reportUnknownComponent(element.type, Object.keys(library));
    return null;
  }

  // Components that opt out of prop streaming wait until their props are
  // complete rather than rendering from a partial parse.
  if (!entry.streamProperties && context.status === "streaming") return null;

  // `children` is a reserved top-level key on the normalized element, not a
  // prop, so it is not in `props`. Inject the framework props last so the model
  // can never override them. `$action` is likewise reserved and stripped from
  // the prop bag during normalization, so it is re-injected here for components
  // that carry behavior (e.g. `Button`).
  const props: Record<string, unknown> = {
    ...withoutForeignValues(element.type, element.props, library),
    $status: context.status,
  };
  if (context.dispatch !== undefined) {
    props["$dispatch"] = context.dispatch;
  }
  if (element.action !== undefined) {
    props["$action"] = element.action;
  }
  if (element.children !== undefined) {
    props["children"] = renderNode(element.children, library, context);
  }

  return <GenerativeUIComponentRenderer render={entry.render} props={props} />;
}

const propOwnersByLibrary = new WeakMap<
  GenerativeUILibrary,
  Map<string, Map<string, z.ZodType>>
>();

const getPropOwners = (library: GenerativeUILibrary) => {
  let propOwners = propOwnersByLibrary.get(library);
  if (!propOwners) {
    propOwners = new Map();
    for (const [type, entry] of Object.entries(library)) {
      if (!(entry.properties instanceof z.ZodObject)) continue;
      for (const [key, schema] of Object.entries(entry.properties.shape)) {
        const owners = propOwners.get(key) ?? new Map<string, z.ZodType>();
        owners.set(type, schema);
        propOwners.set(key, owners);
      }
    }
    propOwnersByLibrary.set(library, propOwners);
  }
  return propOwners;
};

function withoutForeignValues(
  type: string,
  props: Record<string, unknown>,
  library: GenerativeUILibrary,
): Record<string, unknown> {
  const propOwners = getPropOwners(library);
  return Object.fromEntries(
    Object.entries(props).filter(([key, value]) => {
      const owners = propOwners.get(key);
      if (owners === undefined || owners.size < 2) return true;
      const own = owners.get(type);
      if (own === undefined || own.safeParse(value).success) return true;
      for (const [owner, schema] of owners) {
        if (owner !== type && schema.safeParse(value).success) return false;
      }
      return true;
    }),
  );
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

function nodeKey(node: NormalizedUINode, index: number): string {
  return isElement(node) &&
    (typeof node.key === "string" || typeof node.key === "number")
    ? `model:${node.key}`
    : `${index}:${nodeKind(node)}`;
}

function reportUnknownComponent(type: string, available: string[]): void {
  if (process.env["NODE_ENV"] !== "production") {
    // eslint-disable-next-line no-console
    console.error(
      `[@assistant-ui/generative-ui] Unknown component "${type}". ` +
        `Available components: ${available.join(", ") || "(none)"}.`,
    );
  }
}
