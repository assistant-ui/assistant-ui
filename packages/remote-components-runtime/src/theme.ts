import type {
  FontFaceSpec,
  ThemeSnapshot,
} from "@assistant-ui/remote-components-protocol";

/**
 * Applies a host theme snapshot ("CSS tunnelling").
 *
 * - Custom properties and inherited properties go on `<html>` so they reach
 *   everything in the document (including portals the component renders
 *   into `<body>`), exactly as if the content inherited them from the slot.
 * - `<html>` gets the host's *root* font-size so `rem` matches the host; the
 *   slot's own font-size goes on `<body>` (so `em` and inherited text size
 *   match the inline position). The runtime may run before `<body>`
 *   exists; `applyBody()` catches up.
 * - `color-scheme` is applied to `<html>`; matching it is what keeps the
 *   iframe transparent (a mismatch makes browsers paint an opaque canvas).
 * - `lang` goes on `<html lang>`, and the tunnelled `direction` on
 *   `<html dir>`, so `:dir()` and `[dir]` selectors match as they would
 *   inline (the CSS property alone does not set them).
 * - Fonts become `@font-face` rules in a dedicated `<style>`, after
 *   sanitising every descriptor (the host is not trusted to inject CSS).
 *
 * Values are applied with `style.setProperty`, which cannot inject rules.
 */
export class ThemeApplier {
  private appliedHtml = new Set<string>();
  private fontStyle: HTMLStyleElement | null = null;
  private fontsKey = "";

  private fontSize: string | undefined;

  private readonly doc: Document;

  constructor(doc: Document) {
    this.doc = doc;
  }

  apply(theme: ThemeSnapshot): void {
    const html = this.doc.documentElement;
    const next = new Map<string, string>();
    for (const [name, value] of Object.entries(theme.vars)) {
      if (name.startsWith("--")) next.set(name, value);
    }
    for (const [name, value] of Object.entries(theme.inherited)) {
      if (name === "font-size" || name.startsWith("--")) continue;
      next.set(name, value);
    }
    if (theme.rootFontSize !== "") next.set("font-size", theme.rootFontSize);

    for (const name of this.appliedHtml)
      if (!next.has(name)) html.style.removeProperty(name);
    for (const [name, value] of next)
      if (html.style.getPropertyValue(name) !== value)
        html.style.setProperty(name, value);
    this.appliedHtml = new Set(next.keys());

    this.fontSize = theme.inherited["font-size"];
    this.applyBody();

    if (theme.lang !== "") html.lang = theme.lang;
    else html.removeAttribute("lang");
    const dir = theme.inherited.direction;
    if (dir === "rtl" || dir === "ltr") {
      if (html.getAttribute("dir") !== dir) html.setAttribute("dir", dir);
    } else html.removeAttribute("dir");

    this.applyFonts(theme.fonts);
  }

  /** The slot's font-size on <body> (once it exists). */
  applyBody(): void {
    const body = this.doc.body;
    if (body === null) return;
    if (this.fontSize !== undefined)
      body.style.setProperty("font-size", this.fontSize);
    else body.style.removeProperty("font-size");
  }

  private applyFonts(fonts: FontFaceSpec[]): void {
    const css = fonts
      .map(fontFaceRule)
      .filter((r): r is string => r !== null)
      .join("\n");
    if (css === this.fontsKey) return;
    this.fontsKey = css;
    if (this.fontStyle === null) {
      this.fontStyle = this.doc.createElement("style");
      this.fontStyle.dataset.rcFonts = "";
      (this.doc.head ?? this.doc.documentElement).appendChild(this.fontStyle);
    }
    this.fontStyle.textContent = css;
  }
}

/** Builds a safe `@font-face` rule, or null if any descriptor fails validation. */
function fontFaceRule(f: FontFaceSpec): string | null {
  const src = sanitizeFontSrc(f.src);
  if (src === null || f.family.length === 0 || f.family.length > 200)
    return null;
  const parts = [`font-family: ${cssString(f.family)}`, `src: ${src}`];
  const kw = (v: string | undefined, name: string): boolean => {
    if (v === undefined) return true;
    if (!/^[A-Za-z0-9 .%+-]{1,64}$/.test(v)) return false;
    parts.push(`${name}: ${v}`);
    return true;
  };
  if (
    !kw(f.weight, "font-weight") ||
    !kw(f.style, "font-style") ||
    !kw(f.stretch, "font-stretch") ||
    !kw(f.display, "font-display")
  )
    return null;
  if (f.unicodeRange !== undefined) {
    if (
      !/^[Uu]\+[0-9A-Fa-f?]{1,6}(-[0-9A-Fa-f]{1,6})?(\s*,\s*[Uu]\+[0-9A-Fa-f?]{1,6}(-[0-9A-Fa-f]{1,6})?)*$/.test(
        f.unicodeRange,
      )
    )
      return null;
    parts.push(`unicode-range: ${f.unicodeRange}`);
  }
  return `@font-face { ${parts.join("; ")}; }`;
}

const SRC_ITEM =
  /^\s*(?:url\(\s*"((?:[^"\\\n]|\\.)*)"\s*\)|local\(\s*"((?:[^"\\\n]|\\.)*)"\s*\))(\s+format\(\s*"[A-Za-z0-9-]+"\s*\))?(\s+tech\(\s*[A-Za-z0-9-]+\s*\))?\s*$/;

/**
 * Accepts a comma-separated list of `url("…") [format("…")]` or
 * `local("…")` items with absolute http(s)/data URLs. Anything else is
 * rejected (returns null).
 */
function sanitizeFontSrc(src: string): string | null {
  if (src.length > 8192) return null;
  const items = splitTopLevel(src);
  if (items === null || items.length === 0) return null;
  const out: string[] = [];
  for (const item of items) {
    const m = SRC_ITEM.exec(item);
    if (m === null) return null;
    const url = m[1];
    if (
      url !== undefined &&
      !/^(https?:|data:font\/|data:application\/(font|x-font)|data:application\/octet-stream)/i.test(
        url,
      )
    )
      return null;
    out.push(item.trim());
  }
  return out.join(", ");
}

function splitTopLevel(s: string): string[] | null {
  const items: string[] = [];
  let depth = 0;
  let quote = false;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === '"') quote = false;
      continue;
    }
    if (c === '"') quote = true;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) {
      items.push(s.slice(start, i));
      start = i + 1;
    }
    if (depth < 0) return null;
  }
  if (quote || depth !== 0) return null;
  items.push(s.slice(start));
  return items;
}

function cssString(s: string): string {
  return `"${s.replace(/[\\"\n\r\f]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `)}"`;
}
