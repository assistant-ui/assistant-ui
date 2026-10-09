import type { ScreenshotOptions } from "../protocol";

const XHTML = "http://www.w3.org/1999/xhtml";
const SVG = "http://www.w3.org/2000/svg";
const MAX_CANVAS_SIDE = 4096;
const SKIP = new Set(["script", "noscript", "template"]);

export type Screenshot = {
  dataUrl: string;
  width: number;
  height: number;
};

const createDefaultStyles = (doc: Document) => {
  const cache = new Map<string, Map<string, string>>();
  let sandbox: HTMLElement | undefined;
  let svgSandbox: SVGSVGElement | undefined;

  const ensureSandbox = () => {
    if (sandbox) return;
    sandbox = doc.createElement("div");
    sandbox.setAttribute("aria-hidden", "true");
    sandbox.style.cssText =
      "all:initial;position:absolute;left:-99999px;top:0;visibility:hidden;contain:strict;width:0;height:0;";
    svgSandbox = doc.createElementNS(SVG, "svg");
    sandbox.appendChild(svgSandbox);
    doc.body.appendChild(sandbox);
  };

  return {
    get(el: Element): Map<string, string> {
      const key = `${el.namespaceURI}|${el.localName}`;
      let styles = cache.get(key);
      if (styles) return styles;
      ensureSandbox();
      const probe = doc.createElementNS(el.namespaceURI ?? XHTML, el.localName);
      (el.namespaceURI === SVG ? svgSandbox! : sandbox!).appendChild(probe);
      const computed = doc.defaultView!.getComputedStyle(probe);
      styles = new Map();
      for (let i = 0; i < computed.length; i++) {
        const name = computed.item(i);
        styles.set(name, computed.getPropertyValue(name));
      }
      probe.remove();
      cache.set(key, styles);
      return styles;
    },
    dispose() {
      sandbox?.remove();
    },
  };
};

const toDataUrl = (
  source: CanvasImageSource,
  width: number,
  height: number,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  canvas.getContext("2d")!.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL("image/png");
};

/**
 * Clones `node` with every computed style that differs from both the
 * element's default and its parent's value written inline, because a
 * serialized SVG image cannot see the frame's stylesheets.
 */
const cloneWithStyles = (
  node: Node,
  defaults: ReturnType<typeof createDefaultStyles>,
  parentStyle: CSSStyleDeclaration | undefined,
): Node | null => {
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  if (SKIP.has(el.localName)) return null;

  const view = el.ownerDocument.defaultView!;
  const style = view.getComputedStyle(el);
  let clone: Element;

  if (el instanceof view.HTMLCanvasElement) {
    clone = el.ownerDocument.createElement("img");
    try {
      clone.setAttribute("src", el.toDataURL("image/png"));
    } catch {
      // A tainted canvas cannot be read; it stays empty in the capture.
    }
  } else if (
    el instanceof view.HTMLImageElement &&
    el.complete &&
    el.naturalWidth > 0 &&
    !el.src.startsWith("data:")
  ) {
    clone = el.cloneNode(false) as Element;
    try {
      clone.setAttribute(
        "src",
        toDataUrl(el, el.naturalWidth, el.naturalHeight),
      );
    } catch {
      // Cross-origin images without CORS cannot be inlined.
    }
  } else {
    clone = el.cloneNode(false) as Element;
  }

  if (el instanceof view.HTMLInputElement) {
    if (el.type === "checkbox" || el.type === "radio") {
      if (el.checked) clone.setAttribute("checked", "");
      else clone.removeAttribute("checked");
    } else {
      clone.setAttribute("value", el.value);
    }
  } else if (el instanceof view.HTMLTextAreaElement) {
    clone.textContent = el.value;
  } else if (el instanceof view.HTMLSelectElement) {
    clone.setAttribute("data-gf-value", el.value);
  }

  const base = defaults.get(el);
  const declarations: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    if (name.startsWith("--")) continue;
    const value = style.getPropertyValue(name);
    if (
      value !== base.get(name) ||
      (parentStyle && value !== parentStyle.getPropertyValue(name))
    ) {
      declarations.push(`${name}:${value}`);
    }
  }
  if (style.animationName !== "none" || style.transitionProperty !== "none") {
    declarations.push("animation:none", "transition:none");
  }
  clone.setAttribute("style", declarations.join(";"));

  if (!(el instanceof view.HTMLTextAreaElement)) {
    for (const child of Array.from(el.childNodes)) {
      const childClone = cloneWithStyles(child, defaults, style);
      if (childClone) clone.appendChild(childClone);
    }
  }
  if (el instanceof view.HTMLSelectElement) {
    for (const option of Array.from(clone.querySelectorAll("option"))) {
      if (
        option.getAttribute("value") === el.value ||
        option.textContent === el.value
      ) {
        option.setAttribute("selected", "");
      }
    }
  }
  return clone;
};

/** Embeds `@font-face` rules that are already self-contained (`data:` sources). */
const collectInlineFontFaces = (doc: Document): string => {
  const rules: string[] = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(cssRules)) {
      if (
        rule.constructor.name === "CSSFontFaceRule" &&
        !/url\((?!\s*["']?data:)/i.test(rule.cssText)
      ) {
        rules.push(rule.cssText);
      }
    }
  }
  return rules.join("\n");
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("The serialized widget failed to rasterize"));
    img.src = src;
  });

/**
 * Captures `root` as a PNG data URL by serializing a styled clone into an SVG
 * `foreignObject` and drawing it onto a canvas. Best effort: web fonts loaded
 * by URL, cross-origin images, and pseudo-elements are not reproduced.
 */
export async function captureScreenshot(
  root: HTMLElement,
  options: ScreenshotOptions = {},
): Promise<Screenshot> {
  const doc = root.ownerDocument;
  const view = doc.defaultView!;
  await doc.fonts?.ready;

  const rect = root.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(
    1,
    Math.ceil(Math.max(rect.height, root.scrollHeight)),
  );

  const defaults = createDefaultStyles(doc);
  let clone: Node | null;
  try {
    clone = cloneWithStyles(root, defaults, view.getComputedStyle(doc.body));
  } finally {
    defaults.dispose();
  }
  const wrapper = doc.createElementNS(XHTML, "div");
  wrapper.setAttribute(
    "style",
    `width:${width}px;height:${height}px;overflow:hidden;`,
  );
  if (clone) wrapper.appendChild(clone);
  if (clone instanceof Element) {
    clone.setAttribute(
      "style",
      `${clone.getAttribute("style") ?? ""};width:${width}px;margin:0;`,
    );
  }

  const fonts = collectInlineFontFaces(doc);
  const markup = new XMLSerializer().serializeToString(wrapper);
  const svg =
    `<svg xmlns="${SVG}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    (fonts
      ? `<style xmlns="${XHTML}">${fonts.replace(/</g, "\\3c ")}</style>`
      : "") +
    markup +
    `</foreignObject></svg>`;

  const image = await loadImage(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  );

  const requested = options.scale ?? Math.min(view.devicePixelRatio || 1, 2);
  const scale = Math.max(
    0.1,
    Math.min(requested, MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height),
  );
  const canvas = doc.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  const background =
    options.background ??
    view
      .getComputedStyle(doc.documentElement)
      .getPropertyValue("--color-background")
      .trim();
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}
