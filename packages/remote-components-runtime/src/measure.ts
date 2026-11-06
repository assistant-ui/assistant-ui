import type {
  LayoutInfo,
  SizeReport,
} from "@assistant-ui/remote-components-protocol";
import type { CssShim } from "./css.js";

/**
 * Lays out `<html>` as the slot and measures it.
 *
 * `<html>` is the slot: the host owns its box. The exact fractional width
 * the host sends goes on `<html>` (an iframe's viewport is whole pixels, so
 * the page never lays out against it), the height is `auto` unless the
 * host's is definite, and the sub-pixel offset is applied with
 * `position: relative`. These are written `!important` because author
 * rules (`html { height: 100% }`) target the same element. Everything
 * inside `<html>` belongs to the author.
 *
 * Each measurement, in one synchronous pass (no paint in between, so
 * nothing flickers): height with `height: auto` at the host width, then
 * min-content and max-content widths. Then the host's width and height are
 * restored.
 *
 * Triggers: MutationObserver on the document, ResizeObserver on `<html>`,
 * font loads, resource `load` events, layout and theme changes. Coalesced
 * into one measurement per microtask; a report is sent only when a value
 * changed.
 */
export class Measurer {
  private layout: LayoutInfo | null = null;
  private scheduled = false;
  private last: SizeReport | null = null;
  private readonly cleanups: (() => void)[] = [];
  private readonly root: HTMLElement;
  /**
   * Quirks-mode documents (no doctype) make an `auto` <html> fill the
   * viewport, which loops in an auto-height frame. `max-content` is not
   * `auto`, so the quirk does not apply.
   */
  private readonly autoHeight: string;
  /** container-type on <body> while the slot itself is the host's nearest query container. */
  private container: { type: string; name: string } | null = null;

  private readonly doc: Document;
  private readonly css: CssShim | null;
  private readonly onReport: (report: SizeReport) => void;

  constructor(
    doc: Document,
    css: CssShim | null,
    onReport: (report: SizeReport) => void,
  ) {
    this.doc = doc;
    this.css = css;
    this.onReport = onReport;
    this.root = doc.documentElement;
    this.autoHeight = doc.compatMode === "BackCompat" ? "max-content" : "auto";
  }

  get lastReport(): SizeReport | null {
    return this.last;
  }

  get currentLayout(): LayoutInfo | null {
    return this.layout;
  }

  setLayout(layout: LayoutInfo): void {
    this.layout = layout;
    this.apply();
    this.schedule();
  }

  private put(el: HTMLElement, name: string, value: string): void {
    if (value === "") el.style.removeProperty(name);
    else el.style.setProperty(name, value, "important");
  }

  /** Writes the slot's box onto <html> (and body defaults that depend on it). */
  apply(): void {
    const l = this.layout;
    const html = this.root;
    const body = this.doc.body;
    // The slot is the nearest host query container: <body> becomes a
    // container of the same size (in Chromium the root element does not
    // match @container queries). Other host containers are emulated by the
    // CSS shim (css.ts).
    const c = l?.containers?.[0];
    const own =
      l !== null && c !== undefined && Math.abs(c.width - l.width) < 0.01;
    this.container = own ? { type: c.type, name: c.name } : null;
    this.setBodyContainer(this.container);
    this.css?.setLayout(l, own);
    if (l === null) {
      for (const p of ["width", "height", "position", "left", "top"])
        this.put(html, p, "");
      return;
    }
    this.put(html, "width", `${l.width}px`);
    this.put(
      html,
      "height",
      l.height === null ? this.autoHeight : `${l.height}px`,
    );
    // Quirks mode also resolves body's percentage height against the
    // viewport, so body is pinned too.
    if (this.autoHeight !== "auto" && body !== null)
      this.put(body, "height", l.height === null ? "max-content" : "100%");
    this.put(html, "position", "relative");
    this.put(html, "left", `${l.offsetX}px`);
    this.put(html, "top", `${l.offsetY}px`);
  }

  private setBodyContainer(c: { type: string; name: string } | null): void {
    const body = this.doc.body;
    if (body === null) return;
    this.put(body, "container-type", c?.type ?? "");
    this.put(body, "container-name", c === null || c.name === "" ? "" : c.name);
  }

  /** Measures synchronously. Forces layout; call sparingly. */
  measure(): SizeReport {
    const html = this.root;
    this.put(html, "height", this.autoHeight);
    const h = html.getBoundingClientRect().height;
    // Height with the container on (queries match); containment off for
    // the intrinsic widths (inline-size containment hides content from them).
    if (this.container !== null) this.setBodyContainer(null);
    this.put(html, "width", "min-content");
    const min = html.getBoundingClientRect().width;
    this.put(html, "width", "max-content");
    const max = html.getBoundingClientRect().width;
    if (this.container !== null) this.setBodyContainer(this.container);
    // Restore from the numbers, never from the style strings: engines
    // serialise lengths to 6 significant digits ("101.3125px" reads back as
    // "101.312px"), which would lose 1/64 px.
    const l = this.layout;
    this.put(html, "width", l === null ? "" : `${l.width}px`);
    this.put(
      html,
      "height",
      l === null ? "" : l.height === null ? this.autoHeight : `${l.height}px`,
    );
    return {
      width: l?.width ?? html.getBoundingClientRect().width,
      height: h,
      minContent: min,
      maxContent: max,
    };
  }

  /** Measures and reports if anything changed. Returns the current report. */
  flush(): SizeReport {
    this.scheduled = false;
    const r = this.measure();
    const l = this.last;
    if (
      l === null ||
      l.width !== r.width ||
      l.height !== r.height ||
      l.minContent !== r.minContent ||
      l.maxContent !== r.maxContent
    ) {
      this.last = r;
      this.onReport(r);
    }
    return r;
  }

  schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      if (this.scheduled) this.flush();
    });
  }

  start(): void {
    const root = this.root;
    const doc = this.doc;
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        // Our own writes: <html> and <body> style attributes.
        if (
          r.type === "attributes" &&
          r.attributeName === "style" &&
          (r.target === root || r.target === doc.body)
        )
          continue;
        // <body> arrived (the runtime runs from <head>): apply what needs it.
        if (r.type === "childList" && r.target === root) this.apply();
        this.schedule();
        return;
      }
    });
    mo.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    this.cleanups.push(() => mo.disconnect());

    const ro = new ResizeObserver(() => this.schedule());
    ro.observe(root);
    this.cleanups.push(() => ro.disconnect());

    const onLoad = (): void => this.schedule();
    doc.addEventListener("load", onLoad, true);
    this.cleanups.push(() => doc.removeEventListener("load", onLoad, true));

    const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts !== undefined) {
      fonts.addEventListener("loadingdone", onLoad);
      this.cleanups.push(() =>
        fonts.removeEventListener("loadingdone", onLoad),
      );
    }
  }

  stop(): void {
    for (const c of this.cleanups.splice(0)) c();
  }
}
