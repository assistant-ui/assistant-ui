"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import { Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

const flowControlButtonClass =
  "aui-flow-control size-7 cursor-pointer bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground sm:size-8";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type FlowExpandProps = Omit<ComponentProps<"div">, "children"> & {
  children: ReactNode;
};

export function FlowExpand({ className, children, ...props }: FlowExpandProps) {
  const [open, setOpen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dialogId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      drag.current = null;
      setTransform({ x: 0, y: 0, scale: 1 });
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    setTransform((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = scale / current.scale;

      if (cx === undefined || cy === undefined) {
        const viewport = viewportRef.current;
        cx = (viewport?.clientWidth ?? 0) / 2;
        cy = (viewport?.clientHeight ?? 0) / 2;
      }

      return {
        scale,
        x: cx - (cx - current.x) * ratio,
        y: cy - (cy - current.y) * ratio,
      };
    });
  }, []);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      zoomBy(
        Math.exp(-event.deltaY * 0.0015),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    },
    [zoomBy],
  );

  const onPointerDown = useCallback((event: PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setTransform((current) => {
      drag.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: current.x,
        originY: current.y,
      };
      return current;
    });
  }, []);

  const onPointerMove = useCallback((event: PointerEvent) => {
    const currentDrag = drag.current;
    if (!currentDrag) return;

    setTransform((current) => ({
      ...current,
      x: currentDrag.originX + event.clientX - currentDrag.startX,
      y: currentDrag.originY + event.clientY - currentDrag.startY,
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div
        data-slot="flow-expand"
        className={cn("aui-flow-expand group/flow relative", className)}
        {...props}
      >
        {children}
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Expand diagram"
          title="Expand diagram"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          onClick={() => onOpenChange(true)}
          className={cn(
            flowControlButtonClass,
            "aui-flow-expand-trigger absolute end-2 top-2 opacity-0 group-hover/flow:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Maximize2 className="size-3.5" />
        </Button>
        <DialogContent
          id={dialogId}
          showCloseButton={false}
          className="aui-flow-dialog-content bg-background fixed inset-0 start-0 top-0 z-50 max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none sm:max-w-none"
        >
          <DialogTitle className="aui-sr-only sr-only">Diagram</DialogTitle>
          <DialogDescription className="aui-sr-only sr-only">
            Expanded diagram viewer
          </DialogDescription>
          <div
            ref={viewportRef}
            data-slot="flow-expand-viewport"
            className="aui-flow-expand-viewport h-full w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              data-slot="flow-expand-content"
              className="aui-flow-expand-content flex h-full w-full items-center justify-center"
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: "0 0",
              }}
            >
              {children}
            </div>
          </div>
          <div
            data-slot="flow-expand-controls"
            className="aui-flow-expand-controls absolute end-4 top-4 flex items-center gap-1"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => zoomBy(1.25)}
              className={flowControlButtonClass}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() => zoomBy(0.8)}
              className={flowControlButtonClass}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Reset zoom"
              title="Reset zoom"
              onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
              className={flowControlButtonClass}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close diagram"
              title="Close diagram"
              onClick={() => onOpenChange(false)}
              className={flowControlButtonClass}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
}
