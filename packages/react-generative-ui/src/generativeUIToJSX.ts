import { TYPE_KEY } from "./constants";

/**
 * Serializes a generative-UI node to a JSX-like string for display — the
 * "view source" of a model-produced tree. The wire form
 * `{ $type: "Weather", id: "x" }` becomes `<Weather id="x" />`, and nested
 * `children` render between tags: `<Card title="Hi"><Text>hello</Text></Card>`.
 * A model-provided `$key` becomes the JSX `key` attribute.
 *
 * It is a faithful textual rendering, not a parser: text children are emitted
 * verbatim (not HTML/JSX-escaped), so the result is meant to be shown, not
 * re-parsed. Returns `""` for nodes that aren't renderable (no `$type` yet,
 * `null`, booleans).
 */
export function generativeUIToJSX(node: unknown): string {
  return toJSX(node, 0);
}

/**
 * The deepest tree we serialize. Input is model-produced, so a runaway/
 * adversarial response could nest arbitrarily deep and overflow the stack — past
 * this depth (far beyond any real UI) we stop. Mirrors the renderer's bound.
 */
const MAX_DEPTH = 64;

function toJSX(node: unknown, depth: number): string {
  if (depth > MAX_DEPTH) return "";
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node))
    return node.map((child) => toJSX(child, depth + 1)).join("");
  if (typeof node !== "object") return "";

  const {
    [TYPE_KEY]: type,
    $key,
    children,
    ...props
  } = node as Record<string, unknown>;
  if (typeof type !== "string") return "";

  const attrs =
    formatAttr("key", $key) +
    Object.entries(props)
      .map(([key, value]) => formatAttr(key, value))
      .join("");
  const inner = children === undefined ? "" : toJSX(children, depth + 1);

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
