import type {
  ContainerInfo,
  LayoutInfo,
} from "@assistant-ui/remote-components-protocol";
import { loadContainers } from "./chunks.js";
import type { ContainerTwins } from "./cq.js";

/**
 * The CSS shim: makes a page written for a browser window behave as a
 * component in a slot, by rewriting the few CSS features that would
 * otherwise read the frame instead of the slot.
 *
 * 1. Viewport height. In an auto-height frame the viewport *is* the
 *    content, so `min-height: 100vh` grows by the frame's rounding slack
 *    on every report and `height: 100vh` pins whatever height the frame
 *    had. The slot is the viewport instead:
 *      - definite slot height H: 1vh = H / 100;
 *      - auto slot height: `height`/`min-height`/`max-height` (and the
 *        block-size forms) in vh become `auto`/`0px`/`none`, so the content
 *        decides; other vh lengths use the host's viewport height.
 *
 * 2. Host query containers other than the slot. A page's root *is* the
 *    slot, so it cannot sit inside a host container wider than itself.
 *    Container units (`cqw`, …) read custom properties with the host
 *    container's size, and every `@container` rule gets a twin `@media`
 *    rule that is switched on when the host container matches (evaluated
 *    by the browser on a hidden probe of the container's size; cq.ts,
 *    loaded only for pages that need it). Author containers inside the
 *    page reset the unit properties, so their descendants use their own
 *    container.
 *
 * Every rewritten value reads custom properties set on `<html>`, so layout
 * changes need no second rewrite. Covers same-origin stylesheets (also
 * `@import`, `@media`, nesting), `insertRule` (CSS-in-JS) and inline
 * `style` attributes. Cross-origin sheets without CORS cannot be read and
 * are left alone.
 */
const NUM = String.raw`(-?(?:\d*\.)?\d+(?:e[+-]?\d+)?)`;
const VH = new RegExp(String.raw`(^|[^\w-])${NUM}[dsl]?vh\b`, "gi");
const CQ = new RegExp(
  String.raw`(^|[^\w-])${NUM}(cq(?:w|h|i|b|min|max))\b`,
  "gi",
);
const AUTO: Record<string, string> = {
  height: "--rc-auto-h",
  "block-size": "--rc-auto-h",
  "min-height": "--rc-auto-min",
  "min-block-size": "--rc-auto-min",
  "max-height": "--rc-auto-max",
  "max-block-size": "--rc-auto-max",
};
const CQ_UNITS = ["cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax"];
const AUTO_VARS: Record<string, string> = {
  "--rc-auto-h": "auto",
  "--rc-auto-min": "0px",
  "--rc-auto-max": "none",
};

/** Rewrites one declaration value, or returns null when it needs nothing. */
export function rewriteValue(prop: string, value: string): string | null {
  if (value.includes("--rc-")) return null;
  let out = value;
  if (/\d[dsl]?vh\b/i.test(value)) {
    out = out.replace(
      VH,
      (_, pre: string, n: string) => `${pre}calc(${n} * var(--rc-vh))`,
    );
    const auto = AUTO[prop];
    if (auto !== undefined) out = `var(${auto}, ${out})`;
  }
  if (/\dcq(?:w|h|i|b|min|max)\b/i.test(value)) {
    out = out.replace(
      CQ,
      (_, pre: string, n: string, unit: string) =>
        `${pre}calc(${n} * var(--rc-${unit.toLowerCase()}, 1${unit}))`,
    );
  }
  return out === value ? null : out;
}

function rewriteStyle(style: CSSStyleDeclaration): number {
  let n = 0;
  for (let i = 0; i < style.length; i++) {
    const prop = style[i]!;
    const next = rewriteValue(prop, style.getPropertyValue(prop));
    if (next === null) continue;
    style.setProperty(prop, next, style.getPropertyPriority(prop));
    n++;
  }
  // An author container: its descendants use it for container units.
  const type =
    style.getPropertyValue("container-type") ||
    style.getPropertyValue("container");
  if (
    type !== "" &&
    !/^\s*normal\s*$/.test(type) &&
    style.getPropertyValue("--rc-cqw") === ""
  ) {
    for (const u of CQ_UNITS) style.setProperty(`--rc-${u}`, "initial");
    n++;
  }
  return n;
}

export class CssShim {
  private layout: LayoutInfo | null = null;
  private ownContainer = false;
  private queued = false;
  private sawContainerRule = false;
  private twins: ContainerTwins | null = null;
  private loading: Promise<void> | null = null;
  private inPass = false;
  private readonly cleanups: (() => void)[] = [];

  private readonly doc: Document;
  private readonly onChange: () => void;

  constructor(doc: Document, onChange: () => void) {
    this.doc = doc;
    this.onChange = onChange;
    const win = doc.defaultView!;
    // CSS-in-JS inserts rules through the CSSOM, which no observer sees.
    const proto = win.CSSStyleSheet.prototype;
    const insertRule = proto.insertRule;
    const self = this;
    proto.insertRule = function (
      this: CSSStyleSheet,
      rule: string,
      index?: number,
    ): number {
      const i = insertRule.call(this, rule, index);
      if (!self.inPass) self.schedule();
      return i;
    };
    this.cleanups.push(() => (proto.insertRule = insertRule));

    const mo = new win.MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes") {
          if (
            r.target !== doc.documentElement &&
            r.target !== doc.body &&
            rewriteStyle((r.target as HTMLElement).style) > 0
          )
            this.onChange();
          continue;
        }
        const t = r.target as Node;
        if (
          r.type === "characterData"
            ? t.parentNode?.nodeName === "STYLE"
            : t.nodeName === "STYLE" ||
              [...r.addedNodes, ...r.removedNodes].some(relevant)
        )
          this.schedule();
        for (const node of r.addedNodes)
          if (node.nodeName === "LINK")
            node.addEventListener("load", () => this.schedule(), {
              once: true,
            });
      }
    });
    mo.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style"],
    });
    this.cleanups.push(() => mo.disconnect());
    const s = (): void => this.schedule();
    doc.addEventListener("DOMContentLoaded", s, { once: true });
    win.addEventListener("load", s, { once: true });
    this.pass();
  }

  /** Resolves when nothing is loading (the container emulation chunk). */
  get settled(): Promise<void> {
    return this.loading ?? Promise.resolve();
  }

  schedule(): void {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => this.pass());
  }

  /** Rewrites everything new and re-evaluates host container queries. */
  pass(): void {
    this.queued = false;
    this.inPass = true;
    let n = 0;
    try {
      for (const sheet of this.doc.styleSheets) n += this.sheet(sheet);
      for (const el of this.doc.querySelectorAll<HTMLElement>("body [style]"))
        n += rewriteStyle(el.style);
      if (this.twins?.pass() === true) n++;
    } finally {
      this.inPass = false;
    }
    this.maybeLoadTwins();
    if (n > 0) this.onChange();
  }

  private sheet(sheet: CSSStyleSheet): number {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      return 0; // cross-origin without CORS
    }
    return this.rules(rules);
  }

  private rules(rules: CSSRuleList): number {
    let n = 0;
    for (const rule of rules) {
      if ("style" in rule && rule.style instanceof CSSStyleDeclaration)
        n += rewriteStyle(rule.style);
      if ("styleSheet" in rule && rule.styleSheet instanceof CSSStyleSheet)
        n += this.sheet(rule.styleSheet);
      if ("cssRules" in rule && rule.cssRules instanceof CSSRuleList)
        n += this.rules(rule.cssRules);
      if ("containerName" in rule) this.sawContainerRule = true;
    }
    return n;
  }

  setLayout(layout: LayoutInfo | null, ownContainer: boolean): void {
    this.layout = layout;
    this.ownContainer = ownContainer;
    const html = this.doc.documentElement.style;
    const auto = layout !== null && layout.height === null;
    html.setProperty(
      "--rc-vh",
      `${layout?.height != null ? layout.height / 100 : (layout?.viewportHeight ?? 800) / 100}px`,
    );
    for (const [k, v] of Object.entries(AUTO_VARS)) {
      if (auto) html.setProperty(k, v);
      else html.removeProperty(k);
    }
    // Container units against the nearest host container, unless the slot is it.
    const c = ownContainer ? undefined : layout?.containers?.[0];
    for (const u of CQ_UNITS) {
      const v = c === undefined ? null : unitSize(u, c);
      if (v === null) html.removeProperty(`--rc-${u}`);
      else html.setProperty(`--rc-${u}`, `${v / 100}px`);
    }
    if (this.twins?.setLayout(layout, ownContainer) === true) this.onChange();
    this.maybeLoadTwins();
  }

  /**
   * `@container` rules and a host container that is not the slot: load
   * the emulation (rc-cq.js). Pages without either never pay for it.
   */
  private maybeLoadTwins(): void {
    const cs = this.layout?.containers ?? [];
    const needed =
      this.sawContainerRule &&
      (cs.length > 1 || (cs.length === 1 && !this.ownContainer));
    if (!needed || this.twins !== null || this.loading !== null) return;
    this.loading = loadContainers().then(
      ({ ContainerTwins }) => {
        this.twins = new ContainerTwins(this.doc);
        this.twins.setLayout(this.layout, this.ownContainer);
        this.twins.pass();
        this.loading = null;
        this.onChange();
      },
      (err: unknown) => {
        console.error("[rc]", err);
        this.loading = null;
      },
    );
  }

  dispose(): void {
    for (const c of this.cleanups.splice(0)) c();
    this.twins?.dispose();
  }
}

function relevant(node: Node): boolean {
  if (node.nodeName === "STYLE" || node.nodeName === "LINK") return true;
  return (
    node.nodeType === 1 &&
    ((node as Element).hasAttribute("style") ||
      (node as Element).querySelector("style,link,[style]") !== null)
  );
}

function unitSize(unit: string, c: ContainerInfo): number | null {
  const w = c.width;
  const h = c.type === "size" ? c.height : null;
  switch (unit) {
    case "cqw":
    case "cqi":
      return w;
    case "cqh":
    case "cqb":
      return h;
    case "cqmin":
      return h === null ? w : Math.min(w, h);
    default:
      return h === null ? w : Math.max(w, h);
  }
}
