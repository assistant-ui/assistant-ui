import { TYPE_KEY } from "./constants";

/** Options for {@link generativeUIToJSX}. */
export interface GenerativeUIToJSXOptions {
  /** Escape string children so the output is safe to paste back into a JSX file. Defaults to `false`. */
  escape?: boolean;
  /** Pretty-print nested element trees with two-space indentation. Defaults to `false`. */
  pretty?: boolean;
}

/**
 * Serializes a generative-UI node to a JSX-like string for display: the "view source" of a model-produced tree. The wire form `{ $type: "Weather", id: "x" }` becomes `<Weather id="x" />`, and nested `children` render between tags: `<Card title="Hi"><Text>hello</Text></Card>`. A model-provided `$key` becomes the JSX `key` attribute.
 *
 * By default this is a faithful textual rendering, not a parser: text children are emitted verbatim (not HTML/JSX-escaped), so the result is meant to be shown, not re-parsed. Returns `""` for nodes that aren't renderable (no `$type` yet, `null`, booleans).
 *
 * Pass `{ escape: true }` to make the output safe to paste back into JSX: any string child containing `<`, `>`, `&`, `{`, or `}` is emitted as a JSON-stringified expression (`{JSON.stringify(child)}`) instead of verbatim, while a string child with none of those characters still renders verbatim.
 *
 * Pass `{ pretty: true }` to pretty-print nested element trees with two-space indentation, while pure text children stay on one line.
 */
export function generativeUIToJSX(
  node: unknown,
  options?: GenerativeUIToJSXOptions,
): string {
  return toJSX(node, 0, options?.escape ?? false, options?.pretty ?? false, 0);
}

/**
 * The deepest tree we serialize. Input is model-produced, so a runaway/
 * adversarial response could nest arbitrarily deep and overflow the stack — past
 * this depth (far beyond any real UI) we stop. Mirrors the renderer's bound.
 */
const MAX_DEPTH = 64;

/** Characters that would break JSX if emitted verbatim inside a text child. */
const UNSAFE_CHILD_CHARS = /[<>&{}]/;

function toJSX(
  node: unknown,
  depth: number,
  escape: boolean,
  pretty: boolean,
  indent: number,
): string {
  if (depth > MAX_DEPTH) return "";
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return formatChildText(node, escape);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    if (pretty) {
      return collectBlockLines(node, depth, escape, indent).join("\n");
    }
    return node
      .map((child) => toJSX(child, depth + 1, escape, false, 0))
      .join("");
  }
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

  if (!pretty) {
    const inner =
      children === undefined
        ? ""
        : toJSX(children, depth + 1, escape, false, 0);

    return inner === ""
      ? `<${type}${attrs} />`
      : `<${type}${attrs}>${inner}</${type}>`;
  }

  const pad = "  ".repeat(indent);

  if (children === undefined || !hasElementChild(children)) {
    const inner =
      children === undefined
        ? ""
        : toJSX(children, depth + 1, escape, false, 0);
    return inner === ""
      ? `${pad}<${type}${attrs} />`
      : `${pad}<${type}${attrs}>${inner}</${type}>`;
  }

  const lines = collectBlockLines(children, depth + 1, escape, indent + 1);
  if (lines.length === 0) {
    return `${pad}<${type}${attrs} />`;
  }
  return `${pad}<${type}${attrs}>\n${lines.join("\n")}\n${pad}</${type}>`;
}

function hasElementChild(node: unknown, depth = 0): boolean {
  if (depth > MAX_DEPTH) return false;
  if (Array.isArray(node))
    return node.some((child) => hasElementChild(child, depth + 1));
  return (
    node != null &&
    typeof node === "object" &&
    typeof (node as Record<string, unknown>)[TYPE_KEY] === "string"
  );
}

function collectBlockLines(
  node: unknown,
  depth: number,
  escape: boolean,
  indent: number,
): string[] {
  if (depth > MAX_DEPTH) return [];
  if (node == null || typeof node === "boolean") return [];
  if (Array.isArray(node)) {
    return node.flatMap((child) =>
      collectBlockLines(child, depth + 1, escape, indent),
    );
  }
  if (typeof node === "string") {
    return [`${"  ".repeat(indent)}${formatChildText(node, escape)}`];
  }
  if (typeof node === "number") {
    return [`${"  ".repeat(indent)}${String(node)}`];
  }
  const rendered = toJSX(node, depth, escape, true, indent);
  return rendered === "" ? [] : [rendered];
}

function formatChildText(value: string, escape: boolean): string {
  return escape && UNSAFE_CHILD_CHARS.test(value)
    ? `{${JSON.stringify(value)}}`
    : value;
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
