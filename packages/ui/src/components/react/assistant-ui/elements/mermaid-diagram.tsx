"use client";

import { renderMermaidSVG } from "beautiful-mermaid";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import {
  type FC,
  type ReactNode,
  memo,
  type ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type MermaidDiagramProps = {
  code: string;
  className?: string;
  /** Renders a skeleton instead of the diagram while `true`. */
  streaming?: boolean;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

const DANGLING_LINK = /(?:--|==|-\.|~~)[-.=~]*[>ox]?\s*(?:\|[^|]*\|)?$/;

const isIncompleteDiagram = (code: string, svg: string) => {
  if (/^<svg\b[^>]*\swidth="0"/.test(svg)) return true;
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"));
  return (
    /^(?:graph|flowchart)\b/i.test(lines[0] ?? "") &&
    lines.slice(1).some((line) => DANGLING_LINK.test(line))
  );
};

const CSS_IMPORT =
  /@import\s*(?:url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)|"[^"]*"|'[^']*')[^;]*(?:;|$)/g;

const SVG_STYLE = /<style\b[^>]*>([\s\S]*?)<\/style>/g;

const splitSvgStyles = (svg: string) => {
  let css = "";
  let markup = svg;
  let previous: string;
  // Removing one <style> can splice the text around it into another.
  do {
    previous = markup;
    markup = markup.replace(SVG_STYLE, (_, rules: string) => {
      css += rules;
      return "";
    });
  } while (markup !== previous);
  return {
    markup: markup.replace(
      /(<[^>]*?)\sstyle="([^"]*)"/g,
      '$1 data-aui-style="$2"',
    ),
    css: css.replace(CSS_IMPORT, "").trim(),
  };
};

type StyleRoot = Document | ShadowRoot;
type AdoptedSheet = { sheet: CSSStyleSheet; count: number };

const adoptedStyles = new WeakMap<StyleRoot, Map<string, AdoptedSheet>>();

const SCOPE = "[data-aui-mermaid-svg]";

const adoptStyles = (root: StyleRoot, css: string) => {
  const sheets = adoptedStyles.get(root) ?? new Map<string, AdoptedSheet>();
  adoptedStyles.set(root, sheets);
  let entry = sheets.get(css);
  if (!entry) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSStyleRule) {
        rule.selectorText = `:where(${SCOPE}) :is(${rule.selectorText})`;
      }
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    entry = { sheet, count: 0 };
    sheets.set(css, entry);
  }
  entry.count++;
  const adopted = entry;
  return () => {
    if (--adopted.count > 0) return;
    root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
      (s) => s !== adopted.sheet,
    );
    sheets.delete(css);
  };
};

const subscribeNothing = () => () => {};

const supportsAdoptedStyles = () =>
  typeof CSSStyleSheet === "function" &&
  "replaceSync" in CSSStyleSheet.prototype &&
  "adoptedStyleSheets" in document;

type MermaidSvgProps = Omit<
  ComponentProps<"div">,
  "dangerouslySetInnerHTML"
> & {
  svg: string;
};

/**
 * Renders beautiful-mermaid's SVG without inline `<style>` or `style=""`,
 * which a Content Security Policy without 'unsafe-inline' blocks: its CSS
 * goes into a constructed stylesheet scoped to the diagram and its inline
 * styles are set through the CSSOM. Server and hydration renders, and browsers without
 * constructable stylesheets, keep the original markup.
 */
function MermaidSvg({ svg, ...props }: MermaidSvgProps) {
  const ref = useRef<HTMLDivElement>(null);
  const constructable = useSyncExternalStore(
    subscribeNothing,
    supportsAdoptedStyles,
    () => false,
  );
  const { markup, css } = useMemo(() => splitSvgStyles(svg), [svg]);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!constructable || !container) return;
    for (const el of container.querySelectorAll<SVGElement>(
      "[data-aui-style]",
    )) {
      for (const declaration of (el.dataset["auiStyle"] ?? "").split(";")) {
        const colon = declaration.indexOf(":");
        if (colon <= 0) continue;
        el.style.setProperty(
          declaration.slice(0, colon).trim(),
          declaration.slice(colon + 1).trim(),
        );
      }
    }
    if (!css) return;
    const root = container.getRootNode();
    const styleRoot =
      root instanceof ShadowRoot ? root : container.ownerDocument;
    if (!("adoptedStyleSheets" in styleRoot)) return;
    return adoptStyles(styleRoot, css);
  }, [constructable, markup, css]);

  return (
    <div
      ref={ref}
      {...props}
      data-aui-mermaid-svg=""
      dangerouslySetInnerHTML={{ __html: constructable ? markup : svg }}
    />
  );
}

type MermaidZoomProps = {
  svg: string;
  children: ReactNode;
};

function MermaidZoom({ svg, children }: MermaidZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const zoomSvg = useMemo(
    () =>
      svg
        .replace(/id="([^"]+)"/g, 'id="$1-zoom"')
        .replace(/url\(#([^)]+)\)/g, "url(#$1-zoom)")
        .replace(/(href|xlink:href)="#([^"]+)"/g, '$1="#$2-zoom"'),
    [svg],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTransform({ x: 0, y: 0, scale: 1 });
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = overlayRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables?.[0];
      const last = focusables?.[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    setTransform((t) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
      const ratio = scale / t.scale;
      if (cx === undefined || cy === undefined) {
        const viewport = viewportRef.current;
        cx = (viewport?.clientWidth ?? 0) / 2;
        cy = (viewport?.clientHeight ?? 0) / 2;
      }
      return {
        scale,
        x: cx - (cx - t.x) * ratio,
        y: cy - (cy - t.y) * ratio,
      };
    });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      zoomBy(
        Math.exp(-e.deltaY * 0.0015),
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    },
    [zoomBy],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = transformRef.current;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: t.x,
      originY: t.y,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setTransform((t) => ({
      ...t,
      x: d.originX + e.clientX - d.startX,
      y: d.originY + e.clientY - d.startY,
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div
      data-slot="mermaid-zoom-wrap"
      className="aui-mermaid-zoom-wrap group/mermaid relative"
    >
      {children}
      <button
        ref={triggerRef}
        type="button"
        data-slot="mermaid-zoom-trigger"
        aria-label="Expand diagram"
        onClick={() => setIsOpen(true)}
        className="aui-mermaid-zoom-trigger text-muted-foreground hover:text-foreground hover:border-muted-foreground/70 border-border bg-background absolute top-2 right-2 cursor-pointer rounded-md border p-1.5 opacity-0 transition group-hover/mermaid:opacity-100 focus-visible:opacity-100"
      >
        <Maximize2 className="size-3.5" />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={overlayRef}
            data-slot="mermaid-zoom-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Diagram"
            className="aui-mermaid-zoom-overlay fade-in animate-in bg-background fixed inset-0 z-50 duration-200"
          >
            <div
              ref={viewportRef}
              className="aui-mermaid-zoom-viewport h-full w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <MermaidSvg
                data-slot="mermaid-zoom-content"
                className="aui-mermaid-zoom-content flex h-full w-full items-center justify-center [&_svg]:max-h-[80vh] [&_svg]:max-w-[90vw]"
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: "0 0",
                }}
                svg={zoomSvg}
              />
            </div>
            <div
              data-slot="mermaid-zoom-toolbar"
              className="aui-mermaid-zoom-toolbar border-border bg-background absolute top-4 right-4 flex items-center gap-1 rounded-lg border p-1"
            >
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => zoomBy(1.25)}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-1.5"
              >
                <Plus className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => zoomBy(0.8)}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-1.5"
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-1.5"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-1.5"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

const MermaidDiagramImpl: FC<MermaidDiagramProps> = ({
  code,
  className,
  streaming = false,
}) => {
  const result = useMemo(() => {
    if (streaming) return null;
    try {
      const svg = renderMermaidSVG(code, {
        bg: "var(--background)",
        fg: "var(--foreground)",
        muted: "var(--muted-foreground)",
        border: "var(--border)",
        accent: "var(--foreground)",
        transparent: true,
      });
      if (isIncompleteDiagram(code, svg)) {
        throw new Error("Incomplete mermaid diagram");
      }
      return { svg, error: null };
    } catch (err) {
      return {
        svg: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }, [streaming, code]);

  if (!result) {
    return (
      <div
        data-slot="mermaid-skeleton"
        aria-label="Rendering diagram"
        className={cn(
          "aui-mermaid-skeleton bg-muted flex h-32 animate-pulse items-center justify-center gap-3 rounded-b-lg p-4",
          className,
        )}
      >
        <div className="bg-muted-foreground/20 h-8 w-20 rounded-md" />
        <div className="bg-muted-foreground/20 h-px w-10" />
        <div className="bg-muted-foreground/20 h-8 w-20 rounded-md" />
        <div className="bg-muted-foreground/20 h-px w-10" />
        <div className="bg-muted-foreground/20 h-8 w-20 rounded-md" />
      </div>
    );
  }

  if (result.error) {
    return (
      <div
        data-slot="mermaid-fallback"
        className={cn(
          "aui-mermaid-fallback bg-muted/75 rounded-b-lg",
          className,
        )}
      >
        <pre className="overflow-x-auto p-4 text-sm">{code.trim()}</pre>
        <p className="text-muted-foreground border-border border-t px-4 py-1.5 text-xs">
          diagram could not be rendered
        </p>
      </div>
    );
  }

  return (
    <MermaidZoom svg={result.svg}>
      <MermaidSvg
        data-slot="mermaid-diagram"
        className={cn(
          "aui-mermaid-diagram bg-muted overflow-x-auto rounded-b-lg p-2 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full",
          className,
        )}
        svg={result.svg}
      />
    </MermaidZoom>
  );
};

const MermaidDiagram = memo(
  MermaidDiagramImpl,
) as unknown as FC<MermaidDiagramProps> & {
  Zoom: typeof MermaidZoom;
};

MermaidDiagram.displayName = "MermaidDiagram";
MermaidDiagram.Zoom = MermaidZoom;

export { MermaidDiagram, MermaidZoom };
