import { TYPE_KEY } from "./constants";

/**
 * Serializes a generative-UI node to a JSX-like string for display — the
 * "view source" of a model-produced tree. The wire form
 * `{ $type: "Weather", id: "x" }` becomes `<Weather id="x" />`, and nested
 * `children` render between tags: `<Card title="Hi"><Text>hello</Text></Card>`.
 *
 * It is a faithful textual rendering, not a parser: text children are emitted
 * verbatim (not HTML/JSX-escaped), so the result is meant to be shown, not
 * re-parsed. Returns `""` for nodes that aren't renderable (no `$type` yet,
 * `null`, booleans).
 */
export function generativeUIToJSX(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(generativeUIToJSX).join("");
  if (typeof node !== "object") return "";

  const {
    [TYPE_KEY]: type,
    children,
    ...props
  } = node as Record<string, unknown>;
  if (typeof type !== "string") return "";

  const attrs = Object.entries(props)
    .map(([key, value]) => formatAttr(key, value))
    .join("");
  const inner = children === undefined ? "" : generativeUIToJSX(children);

  return inner === ""
    ? `<${type}${attrs} />`
    : `<${type}${attrs}>${inner}</${type}>`;
}

/** Formats one prop as a JSX attribute (`id="x"`, `count={3}`, `open`, …). */
function formatAttr(key: string, value: unknown): string {
  if (value === undefined) return "";
  if (value === true) return ` ${key}`;
  if (typeof value === "string") {
    // Plain double-quoted form when safe; expression form when a quote or
    // newline would break the attribute.
    return /["\n]/.test(value)
      ? ` ${key}={${JSON.stringify(value)}}`
      : ` ${key}="${value}"`;
  }
  return ` ${key}={${JSON.stringify(value)}}`;
}
