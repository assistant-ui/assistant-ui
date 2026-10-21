import { detectWidgetKind, type WidgetKind } from "../protocol";

export const SCRIPT_PLACEHOLDER = "gf-script";

const NON_VISUAL = new Set([
  "style",
  "script",
  "meta",
  "link",
  "title",
  "base",
]);

export type ParsedMarkup = {
  fragment: DocumentFragment;
  /** Scripts in document order; each one's position holds a placeholder comment. */
  scripts: Element[];
};

/**
 * Drops a trailing `<style>` element that has not closed yet, so half-written
 * CSS never applies and then snaps when the rule completes.
 */
export function stripUnclosedStyle(source: string): string {
  const open = source.toLowerCase().lastIndexOf("<style");
  if (open === -1) return source;
  const next = source.charAt(open + 6);
  if (next !== "" && !/[\s>/]/.test(next)) return source;
  return source.toLowerCase().includes("</style", open)
    ? source
    : source.slice(0, open);
}

/**
 * Parses (possibly partial) markup into a detached fragment. The HTML parser
 * closes open elements and drops a tag cut off mid-way, so any prefix of a
 * document parses into a well-formed tree.
 */
export function parseMarkup(doc: Document, source: string): ParsedMarkup {
  const template = doc.createElement("template");
  template.innerHTML = source;
  const fragment = template.content;
  const scripts: Element[] = [];
  for (const script of Array.from(fragment.querySelectorAll("script"))) {
    script.replaceWith(doc.createComment(SCRIPT_PLACEHOLDER));
    scripts.push(script);
  }
  return { fragment, scripts };
}

export type MorphContext = {
  onAdded(node: Node): void;
};

const sameNode = (live: Node, next: Node): boolean => {
  if (live.nodeType !== next.nodeType) return false;
  if (live.nodeType !== Node.ELEMENT_NODE) return true;
  const a = live as Element;
  const b = next as Element;
  return (
    a.localName === b.localName &&
    a.namespaceURI === b.namespaceURI &&
    a.getAttribute("id") === b.getAttribute("id")
  );
};

const syncAttributes = (live: Element, next: Element) => {
  for (const attr of Array.from(next.attributes)) {
    if (live.getAttributeNS(attr.namespaceURI, attr.localName) === attr.value) {
      continue;
    }
    try {
      if (attr.namespaceURI) {
        live.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
      } else {
        live.setAttribute(attr.name, attr.value);
      }
    } catch {
      // The parser accepts attribute names the DOM API rejects; they carry no meaning.
    }
  }
  for (const attr of Array.from(live.attributes)) {
    if (!next.hasAttributeNS(attr.namespaceURI, attr.localName)) {
      live.removeAttributeNS(attr.namespaceURI, attr.localName);
    }
  }
};

const patchNode = (live: Node, next: Node, ctx: MorphContext) => {
  if (live.nodeType !== Node.ELEMENT_NODE) {
    if (live.nodeValue !== next.nodeValue) live.nodeValue = next.nodeValue;
    return;
  }
  const liveEl = live as Element;
  const nextEl = next as Element;
  syncAttributes(liveEl, nextEl);
  if (
    liveEl instanceof HTMLTemplateElement &&
    nextEl instanceof HTMLTemplateElement
  ) {
    if (liveEl.innerHTML !== nextEl.innerHTML) {
      liveEl.content.replaceChildren(nextEl.content);
    }
    return;
  }
  morphChildren(liveEl, nextEl, ctx);
};

/**
 * Makes `live`'s children match `next`'s, reusing live nodes matched by
 * position and tag. Unmatched nodes move out of `next` into `live`.
 */
export function morphChildren(
  live: ParentNode & Node,
  next: ParentNode & Node,
  ctx: MorphContext,
): void {
  const nextNodes = Array.from(next.childNodes);
  let cursor: ChildNode | null = live.firstChild;

  for (let i = 0; i < nextNodes.length; i++) {
    const nextChild = nextNodes[i]!;
    if (!cursor) {
      live.appendChild(nextChild);
      ctx.onAdded(nextChild);
      continue;
    }
    if (sameNode(cursor, nextChild)) {
      patchNode(cursor, nextChild, ctx);
      cursor = cursor.nextSibling;
      continue;
    }
    const following = nextNodes[i + 1];
    if (following && sameNode(cursor, following)) {
      live.insertBefore(nextChild, cursor);
      ctx.onAdded(nextChild);
      continue;
    }
    const afterCursor: ChildNode | null = cursor.nextSibling;
    if (afterCursor && sameNode(afterCursor, nextChild)) {
      cursor.remove();
      patchNode(afterCursor, nextChild, ctx);
      cursor = afterCursor.nextSibling;
      continue;
    }
    live.replaceChild(nextChild, cursor);
    ctx.onAdded(nextChild);
    cursor = afterCursor;
  }

  while (cursor) {
    const after: ChildNode | null = cursor.nextSibling;
    cursor.remove();
    cursor = after;
  }
}

export type ScriptRunner = (
  placeholder: Comment,
  original: Element,
) => Promise<void>;

export type StreamRendererOptions = {
  root: HTMLElement;
  /** Whether newly inserted elements fade in. Checked per insertion. */
  animate?: () => boolean;
  /** Schedules a coalesced render; returns a cancel function. */
  schedule?: (render: () => void) => () => void;
  runScript?: ScriptRunner;
  onScriptError?: (message: string, src: string | undefined) => void;
  onRender?: (kind: WidgetKind) => void;
};

export type StreamRenderer = {
  readonly source: string;
  readonly kind: WidgetKind;
  readonly ended: boolean;
  readonly scriptsRan: boolean;
  write(chunk: string): void;
  /** Renders the complete source, then runs held scripts in document order. */
  end(): Promise<void>;
  replace(code: string): Promise<void>;
  flush(): void;
};

const SCRIPT_LOAD_TIMEOUT_MS = 15_000;

const defaultSchedule = (render: () => void) => {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    render();
  };
  // rAF alone stalls in hidden or offscreen frames, which previews use.
  const frame = requestAnimationFrame(run);
  const timer = setTimeout(run, 50);
  return () => {
    done = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
};

export const createScriptRunner =
  (
    onError: (message: string, src: string | undefined) => void = () => {},
  ): ScriptRunner =>
  (placeholder, original) => {
    const doc = placeholder.ownerDocument;
    const script = doc.createElementNS(
      original.namespaceURI ?? "http://www.w3.org/1999/xhtml",
      "script",
    );
    for (const attr of Array.from(original.attributes)) {
      try {
        script.setAttribute(attr.name, attr.value);
      } catch {
        // See syncAttributes.
      }
    }
    script.textContent = original.textContent;
    const src = script.getAttribute("src") ?? script.getAttribute("href");
    if (!src) {
      placeholder.replaceWith(script);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        onError(`Script timed out: ${src}`, src);
        resolve();
      }, SCRIPT_LOAD_TIMEOUT_MS);
      script.addEventListener("load", () => {
        clearTimeout(timer);
        resolve();
      });
      script.addEventListener("error", () => {
        clearTimeout(timer);
        onError(`Script failed to load: ${src}`, src);
        resolve();
      });
      placeholder.replaceWith(script);
    });
  };

const fadeIn = (node: Node) => {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (NON_VISUAL.has(el.localName) || typeof el.animate !== "function") return;
  el.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 200,
    easing: "ease-out",
  });
};

export function createStreamRenderer(
  options: StreamRendererOptions,
): StreamRenderer {
  const { root } = options;
  const doc = root.ownerDocument;
  const schedule = options.schedule ?? defaultSchedule;
  const runScript =
    options.runScript ?? createScriptRunner(options.onScriptError);
  let source = "";
  let kind: WidgetKind = "html";
  let ended = false;
  let scriptsRan = false;
  let cancelScheduled: (() => void) | undefined;
  let lastRendered: string | undefined;
  let lastScripts: Element[] = [];

  const ctx: MorphContext = {
    onAdded(node) {
      if (options.animate?.()) fadeIn(node);
    },
  };

  const render = (final: boolean) => {
    cancelScheduled?.();
    cancelScheduled = undefined;
    const markup = final ? source : stripUnclosedStyle(source);
    if (markup === lastRendered) return;
    lastRendered = markup;
    kind = detectWidgetKind(source);
    root.dataset["kind"] = kind;
    const parsed = parseMarkup(doc, markup);
    lastScripts = parsed.scripts;
    morphChildren(root, parsed.fragment, ctx);
    options.onRender?.(kind);
  };

  const runHeldScripts = async () => {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    const placeholders: Comment[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeValue === SCRIPT_PLACEHOLDER) {
        placeholders.push(node as Comment);
      }
    }
    const scripts = lastScripts;
    for (let i = 0; i < placeholders.length && i < scripts.length; i++) {
      await runScript(placeholders[i]!, scripts[i]!);
    }
    if (scripts.length > 0 && !scriptsRan) {
      scriptsRan = true;
      // The bootstrap document loaded long ago; widgets written for a fresh page wait for these.
      doc.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
      doc.defaultView?.dispatchEvent(new Event("load"));
    }
  };

  return {
    get source() {
      return source;
    },
    get kind() {
      return kind;
    },
    get ended() {
      return ended;
    },
    get scriptsRan() {
      return scriptsRan;
    },
    write(chunk) {
      if (ended) throw new Error("Cannot write after end; use replace");
      if (!chunk) return;
      source += chunk;
      cancelScheduled ??= schedule(() => {
        cancelScheduled = undefined;
        render(false);
      });
    },
    async end() {
      if (ended) return;
      ended = true;
      render(true);
      await runHeldScripts();
    },
    async replace(code) {
      ended = true;
      source = code;
      render(true);
      await runHeldScripts();
    },
    flush() {
      if (cancelScheduled) render(ended);
    },
  };
}
