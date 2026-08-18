"use client";

import { useAuiState } from "@assistant-ui/react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { renderMermaidSVG } from "beautiful-mermaid";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import {
  type FC,
  type ReactNode,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type MermaidDiagramProps = SyntaxHighlighterProps & {
  className?: string;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

type MermaidZoomProps = {
  svg: string;
  children: ReactNode;
};

function MermaidZoom({ svg, children }: MermaidZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
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

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (!nextOpen) {
      drag.current = null;
      setTransform({ x: 0, y: 0, scale: 1 });
    }
  }, []);

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <div
        data-slot="mermaid-zoom-wrap"
        className="aui-mermaid-zoom-wrap group/mermaid relative"
      >
        {children}
        <DialogTrigger
          data-slot="mermaid-zoom-trigger"
          aria-label="Expand diagram"
          className="aui-mermaid-zoom-trigger text-muted-foreground hover:text-foreground hover:border-muted-foreground/70 border-border bg-background absolute top-2 right-2 cursor-pointer rounded-md border p-1.5 opacity-0 transition group-hover/mermaid:opacity-100 focus-visible:opacity-100"
        >
          <Maximize2 className="size-3.5" />
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="aui-mermaid-zoom-overlay bg-background fixed inset-0 start-0 top-0 z-50 max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none sm:max-w-none"
        >
          <DialogTitle className="aui-sr-only sr-only">Diagram</DialogTitle>
          <DialogDescription className="aui-sr-only sr-only">
            Expanded diagram viewer
          </DialogDescription>
          <div
            ref={viewportRef}
            className="aui-mermaid-zoom-viewport h-full w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              data-slot="mermaid-zoom-content"
              className="aui-mermaid-zoom-content flex h-full w-full items-center justify-center [&_svg]:max-h-[80vh] [&_svg]:max-w-[90vw]"
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: "0 0",
              }}
              dangerouslySetInnerHTML={{ __html: zoomSvg }}
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
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer rounded-sm p-1.5"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
}

/**
 * Use it by passing to `componentsByLanguage` for mermaid in `markdown-text.tsx`.
 *
 * @example
 * const MarkdownTextImpl = () => {
 *   return (
 *     <MarkdownTextPrimitive
 *       remarkPlugins={[remarkGfm]}
 *       className="aui-md"
 *       components={defaultComponents}
 *       componentsByLanguage={{
 *         mermaid: {
 *           SyntaxHighlighter: MermaidDiagram
 *         },
 *       }}
 *     />
 *   );
 * };
 */
const MermaidDiagramImpl: FC<MermaidDiagramProps> = ({
  code,
  className,
  node: _node,
  components: _components,
  language: _language,
}) => {
  const isComplete = useAuiState(
    (s) => s.optional.part?.status.type !== "running",
  );

  const result = useMemo(() => {
    if (!isComplete) return null;
    try {
      return {
        svg: renderMermaidSVG(code, {
          bg: "var(--background)",
          fg: "var(--foreground)",
          muted: "var(--muted-foreground)",
          border: "var(--border)",
          accent: "var(--foreground)",
          transparent: true,
        }),
        error: null,
      };
    } catch (err) {
      return {
        svg: null,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }, [isComplete, code]);

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
      <div
        data-slot="mermaid-diagram"
        className={cn(
          "aui-mermaid-diagram bg-muted rounded-b-lg p-2 [&_svg]:mx-auto",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: result.svg }}
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
