import { createElement, type ReactNode } from "react";
import type { UINode, UIRegistry } from "./types";

const isElement = (node: UINode): node is Exclude<UINode, string> =>
  typeof node === "object" && node !== null && typeof node.type === "string";

function renderNode(
  node: UINode,
  registry: UIRegistry,
  key: string,
): ReactNode {
  if (typeof node === "string") return node;
  if (!isElement(node)) return null;

  const { type, children, ...props } = node;
  const Component = registry[type];
  if (!Component) {
    return (
      <span
        key={key}
        className="text-destructive bg-destructive/10 rounded px-1 font-mono text-xs"
      >
        unknown: {type}
      </span>
    );
  }

  const renderedChildren = Array.isArray(children)
    ? children.map((child, index) =>
        renderNode(child, registry, `${key}/${index}`),
      )
    : undefined;

  return createElement(
    Component,
    { ...props, key },
    ...(renderedChildren ?? []),
  );
}

/** Renders a JSON UI node (or array of nodes) against a component registry. */
export function JsonUI({
  node,
  registry,
}: {
  node: UINode | readonly UINode[];
  registry: UIRegistry;
}) {
  const nodes = Array.isArray(node) ? node : [node as UINode];
  return <>{nodes.map((n, i) => renderNode(n, registry, `${i}`))}</>;
}
