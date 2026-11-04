import type {
  FontFaceSpec,
  ThemeSnapshot,
} from "@assistant-ui/remote-components-protocol";
import { canonicalTokens } from "./tokens.js";

/**
 * Inherited CSS properties tunnelled from the slot into the remote. These
 * are the properties an inline component would inherit from its parent.
 * Non-inherited properties (background, border, …) never cross: they belong
 * to the slot itself, which the host styles directly.
 */
export const TUNNELLED_PROPERTIES = [
  "color",
  "color-scheme",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-stretch",
  "font-variant",
  "font-feature-settings",
  "font-variation-settings",
  "font-kerning",
  "font-optical-sizing",
  "font-size-adjust",
  "font-synthesis",
  "font-palette",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-align",
  "text-indent",
  "text-transform",
  "text-shadow",
  "text-rendering",
  "text-underline-offset",
  "text-underline-position",
  "text-decoration-skip-ink",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "white-space-collapse",
  "text-wrap-mode",
  "text-wrap-style",
  "word-break",
  "overflow-wrap",
  "line-break",
  "hyphens",
  "hyphenate-character",
  "tab-size",
  "direction",
  "writing-mode",
  "caret-color",
  "accent-color",
  "cursor",
  "quotes",
  "list-style-type",
  "list-style-position",
  "image-rendering",
  "paint-order",
  "forced-color-adjust",
  "print-color-adjust",
  "-webkit-font-smoothing",
  "-moz-osx-font-smoothing",
  "-webkit-text-stroke-width",
  "-webkit-text-stroke-color",
  "-webkit-text-fill-color",
] as const;

/** Tunnelled properties whose initial value is `currentcolor`. */
const CURRENTCOLOR_DEFAULTS = [
  "-webkit-text-fill-color",
  "-webkit-text-stroke-color",
  "caret-color",
  "text-emphasis-color",
] as const;

export interface ThemeOptions {
  /**
   * Which custom properties to forward. Default: all custom properties in
   * the slot's computed style. A list of names or prefixes (ending in `*`),
   * or a predicate.
   */
  vars?: readonly string[] | ((name: string) => boolean);
  /** Extra custom properties, merged over the computed ones. */
  extraVars?: Record<string, string>;
  /**
   * Add canonical tokens (generative-frame names: `--color-text`,
   * `--color-surface`, `--radius-md`, …) for names the host does not
   * define.
   * Default true.
   */
  tokens?: boolean;
  /**
   * Fonts to register in the remote. "auto" (default) forwards every
   * `@font-face` rule from same-origin/CORS-readable stylesheets, with URLs
   * made absolute. Font files must be served with
   * `Access-Control-Allow-Origin` (fonts are CORS requests; opaque-origin
   * remotes send `Origin: null`, so use `*`).
   */
  fonts?: "auto" | "none" | readonly FontFaceSpec[];
}

function varFilter(opt: ThemeOptions["vars"]): (name: string) => boolean {
  if (opt === undefined) return () => true;
  if (typeof opt === "function") return opt;
  const exact = new Set(opt.filter((n) => !n.endsWith("*")));
  const prefixes = opt
    .filter((n) => n.endsWith("*"))
    .map((n) => n.slice(0, -1));
  return (name) => exact.has(name) || prefixes.some((p) => name.startsWith(p));
}

/**
 * Reads the theme at `slot`: the inherited properties and custom properties
 * an inline child of `slot` would see.
 *
 * `line-height`: browsers report a resolved pixel value even when the
 * author wrote a unitless number. A unitless line-height inherits as a
 * factor, a pixel one does not, so when px/font-size is a "round" ratio
 * (exact to 1/1000) we send the unitless ratio. This is a heuristic; pass a
 * unitless or explicit line-height on the remote's own elements if it matters.
 */
export function readTheme(
  slot: Element,
  options: ThemeOptions = {},
): ThemeSnapshot {
  const doc = slot.ownerDocument;
  const win = doc.defaultView!;
  const cs = win.getComputedStyle(slot);
  const inherited: Record<string, string> = {};
  for (const p of TUNNELLED_PROPERTIES) {
    const v = cs.getPropertyValue(p);
    if (v !== "") inherited[p] = v;
  }
  // Properties whose initial value is `currentcolor` compute to the current
  // color. Forwarding that resolved color would freeze it in the remote (a
  // child with a different `color` would still paint in the old one), so
  // they are forwarded only when they differ from `color`.
  for (const p of CURRENTCOLOR_DEFAULTS) {
    if (inherited[p] !== undefined && inherited[p] === inherited.color)
      delete inherited[p];
  }
  const lh = inherited["line-height"];
  const fs = parseFloat(inherited["font-size"] ?? "");
  if (lh !== undefined && lh.endsWith("px") && fs > 0) {
    const ratio = parseFloat(lh) / fs;
    const rounded = Math.round(ratio * 1000) / 1000;
    if (Math.abs(ratio - rounded) < 1e-6)
      inherited["line-height"] = String(rounded);
  }

  const vars: Record<string, string> = {};
  const accept = varFilter(options.vars);
  for (let i = 0; i < cs.length; i++) {
    const name = cs.item(i);
    if (name.startsWith("--") && accept(name))
      vars[name] = cs.getPropertyValue(name);
  }
  if (options.extraVars) Object.assign(vars, options.extraVars);
  if (options.tokens !== false) {
    // Fill in (never override) canonical names.
    const { variables } = canonicalTokens(slot, cs);
    for (const [k, v] of Object.entries(variables))
      if (!(k in vars)) vars[k] = v;
  }

  const fonts =
    options.fonts === undefined || options.fonts === "auto"
      ? collectFontFaces(doc)
      : options.fonts === "none"
        ? []
        : [...options.fonts];
  const langEl = slot.closest("[lang]");
  return {
    inherited,
    vars,
    fonts,
    lang: langEl?.getAttribute("lang") ?? "",
    rootFontSize: win.getComputedStyle(doc.documentElement).fontSize,
  };
}

const fontCache = new WeakMap<
  Document,
  { sheets: number; fonts: FontFaceSpec[] }
>();

/** Collects `@font-face` rules from readable stylesheets (cached until the sheet list changes). */
export function collectFontFaces(doc: Document): FontFaceSpec[] {
  const cached = fontCache.get(doc);
  if (cached !== undefined && cached.sheets === doc.styleSheets.length)
    return cached.fonts;
  const fonts: FontFaceSpec[] = [];
  const visit = (rules: CSSRuleList, base: string): void => {
    for (const rule of rules) {
      if (fonts.length >= 128) return;
      if (rule instanceof CSSFontFaceRule) {
        const s = rule.style;
        const family = s
          .getPropertyValue("font-family")
          .trim()
          .replace(/^["']|["']$/g, "");
        const src = absolutizeUrls(s.getPropertyValue("src"), base);
        if (family === "" || src === "") continue;
        const spec: FontFaceSpec = { family, src };
        const opt = (
          name: string,
          key: "weight" | "style" | "stretch" | "display" | "unicodeRange",
        ): void => {
          const v = s.getPropertyValue(name).trim();
          if (v !== "") spec[key] = v;
        };
        opt("font-weight", "weight");
        opt("font-style", "style");
        opt("font-stretch", "stretch");
        opt("font-display", "display");
        opt("unicode-range", "unicodeRange");
        fonts.push(spec);
      } else if (
        "cssRules" in rule &&
        (rule instanceof CSSMediaRule ||
          rule instanceof CSSSupportsRule ||
          (typeof CSSLayerBlockRule !== "undefined" &&
            rule instanceof CSSLayerBlockRule))
      ) {
        visit((rule as CSSGroupingRule).cssRules, base);
      } else if (rule instanceof CSSImportRule && rule.styleSheet) {
        try {
          visit(rule.styleSheet.cssRules, rule.styleSheet.href ?? base);
        } catch {
          /* cross-origin import */
        }
      }
    }
  };
  for (const sheet of doc.styleSheets) {
    try {
      visit(sheet.cssRules, sheet.href ?? doc.baseURI);
    } catch {
      /* cross-origin stylesheet without CORS: not readable */
    }
  }
  fontCache.set(doc, { sheets: doc.styleSheets.length, fonts });
  return fonts;
}

/** Rewrites `url(…)` tokens to absolute `url("…")`. */
export function absolutizeUrls(src: string, base: string): string {
  return src.replace(
    /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)\s]*))\s*\)/g,
    (_m, dq?: string, sq?: string, bare?: string) => {
      const raw = dq ?? sq ?? bare ?? "";
      let abs: string;
      try {
        abs = new URL(raw, base).href;
      } catch {
        abs = raw;
      }
      return `url(${JSON.stringify(abs)})`;
    },
  );
}

type ThemeListener = () => void;

const TUNNELLED = new Set<string>(TUNNELLED_PROPERTIES);
/** Longest a transition or animation keeps the per-frame re-read going without an end event. */
const MAX_ANIMATION_MS = 5000;

/**
 * One watcher per document: notices changes that can alter any slot's
 * theme and notifies subscribers once per animation frame. Each subscriber
 * re-reads its own theme and sends it only if it changed.
 *
 * Triggers: class/style/lang/dir/data-* attribute changes anywhere,
 * stylesheet changes, `prefers-color-scheme`, window resizes (media
 * queries), and pointer or focus moves that change `:hover` or
 * `:focus-within` on an element that contains a slot. While a transition or animation of a tunnelled or custom
 * property runs on an element that contains a slot, subscribers run every
 * frame, so the remote follows the host's colour fade instead of keeping
 * the value from the first frame.
 */
class ThemeWatcher {
  private readonly listeners = new Set<ThemeListener>();
  private frame = 0;
  private readonly cleanup: () => void;
  /** Running transitions/animations that can change a slot's theme: key → start time. */
  private readonly running = new Map<string, number>();
  private readonly ids = new WeakMap<EventTarget, number>();
  private nextId = 1;

  private readonly doc: Document;

  constructor(doc: Document) {
    this.doc = doc;
    const win = doc.defaultView!;
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        const t = r.target;
        // Ignore our own slot internals (sizer/iframe style writes).
        if (t instanceof Element && t.closest("[data-rc-internal]") !== null)
          continue;
        this.schedule();
        return;
      }
    });
    mo.observe(doc.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "lang",
        "dir",
        "data-theme",
        "data-mode",
        "data-color-scheme",
      ],
      childList: false,
    });
    const headMo = new MutationObserver(() => this.schedule());
    headMo.observe(doc.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const mql = win.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => this.schedule();
    mql.addEventListener("change", onChange);
    win.addEventListener("resize", onChange);
    const onStart = (ev: Event): void => {
      const key = this.animationKey(ev);
      if (key === null) return;
      this.running.set(key, performance.now());
      this.schedule();
    };
    const onEnd = (ev: Event): void => {
      const key = this.animationKey(ev);
      if (key === null) return;
      this.running.delete(key);
      this.schedule();
    };
    // :hover and :focus-within on a slot's ancestors. The elements whose
    // state changed are the ancestors of one target that do not contain the
    // other; re-read only when one of them contains a slot.
    const onHoverOrFocus = (ev: Event): void => {
      const related = (ev as MouseEvent | FocusEvent).relatedTarget;
      if (
        changedContainSlot(ev.target, related) ||
        changedContainSlot(related, ev.target)
      )
        this.schedule();
    };
    const events: [string, (ev: Event) => void][] = [
      ["pointerover", onHoverOrFocus],
      ["pointerout", onHoverOrFocus],
      ["focusin", onHoverOrFocus],
      ["focusout", onHoverOrFocus],
      ["transitionrun", onStart],
      ["transitionend", onEnd],
      ["transitioncancel", onEnd],
      ["animationstart", onStart],
      ["animationend", onEnd],
      ["animationcancel", onEnd],
    ];
    for (const [type, fn] of events) doc.addEventListener(type, fn, true);
    this.cleanup = () => {
      mo.disconnect();
      headMo.disconnect();
      mql.removeEventListener("change", onChange);
      win.removeEventListener("resize", onChange);
      for (const [type, fn] of events) doc.removeEventListener(type, fn, true);
      if (this.frame !== 0) win.cancelAnimationFrame(this.frame);
      this.frame = 0;
    };
  }

  /** A key for a transition/animation that can change a slot's theme, else null. */
  private animationKey(ev: Event): string | null {
    const target = ev.target;
    if (
      !(target instanceof Element) ||
      target.closest("[data-rc-internal]") !== null
    )
      return null;
    let name: string;
    if (ev.type.startsWith("transition")) {
      name = (ev as TransitionEvent).propertyName;
      if (!TUNNELLED.has(name) && !name.startsWith("--")) return null;
    } else {
      name = `@${(ev as AnimationEvent).animationName}`;
    }
    // Only an element that contains a slot passes its values on to a remote.
    if (target.querySelector("[data-rc-slot]") === null) return null;
    let id = this.ids.get(target);
    if (id === undefined) this.ids.set(target, (id = this.nextId++));
    return `${id}:${name}`;
  }

  subscribe(l: ThemeListener): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
      if (this.listeners.size === 0) {
        this.cleanup();
        watchers.delete(this.doc);
      }
    };
  }

  schedule(): void {
    if (this.frame !== 0) return;
    this.frame = this.doc.defaultView!.requestAnimationFrame(() => {
      this.frame = 0;
      for (const l of [...this.listeners]) l();
      // Keep following running transitions; drop ones that never ended.
      const now = performance.now();
      for (const [key, at] of this.running)
        if (now - at > MAX_ANIMATION_MS) this.running.delete(key);
      if (this.running.size > 0) this.schedule();
    });
  }
}

/**
 * Whether an ancestor of `from` (or `from`) that does not contain `to`
 * contains a slot: moving from `to` to `from` changed its `:hover` or
 * `:focus-within`.
 */
export function changedContainSlot(
  from: EventTarget | null,
  to: EventTarget | null,
): boolean {
  if (!(from instanceof Node)) return false;
  const other = to instanceof Node ? to : null;
  let top: Element | null = null;
  for (
    let el: Element | null =
      from instanceof Element ? from : from.parentElement;
    el !== null;
    el = el.parentElement
  ) {
    if (other !== null && el.contains(other)) break;
    top = el;
  }
  return (
    top !== null &&
    (top.matches("[data-rc-slot]") ||
      top.querySelector("[data-rc-slot]") !== null)
  );
}

const watchers = new WeakMap<Document, ThemeWatcher>();

/** Calls `listener` (at most once per frame) when the document's theme may have changed. */
export function watchTheme(doc: Document, listener: ThemeListener): () => void {
  let w = watchers.get(doc);
  if (w === undefined) {
    w = new ThemeWatcher(doc);
    watchers.set(doc, w);
  }
  return w.subscribe(listener);
}
