"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/radix/toggle-group";
import { VARIANTS_DEMO_PATH } from "@/lib/embedded-paths";
import { cn } from "@/lib/utils";

const SHOWN_ORIGIN = "localhost:3000/recipes/lemon-pasta";

const DEVICES = [
  { id: "desktop", label: "Desktop", width: null, Icon: Monitor },
  { id: "tablet", label: "Tablet", width: 768, Icon: Tablet },
  { id: "mobile", label: "Mobile", width: 390, Icon: Smartphone },
] as const;

const MIN_WIDTH = 360;

type Device = (typeof DEVICES)[number]["id"];

function ResizeGrip({
  side,
  value,
  max,
  onPointerDown,
  onKeyDown,
}: {
  side: "left" | "right";
  value: number;
  max: number;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the preview"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "group/grip focus-visible:ring-ring rounded-capsule absolute top-1/2 hidden h-16 w-3 -translate-y-1/2 cursor-ew-resize touch-none place-items-center focus-visible:ring-2 focus-visible:outline-none md:grid",
        side === "left" ? "-left-4" : "-right-4",
      )}
    >
      <span className="bg-foreground/20 group-hover/grip:bg-foreground/45 rounded-capsule h-10 w-1 transition-colors" />
    </div>
  );
}

export function VariantsBrowserFrame() {
  const iframe = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [width, setWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [available, setAvailable] = useState(MIN_WIDTH);

  // The stage isn't attached during the first render, so handlers read it live
  // and rendering uses the width it last reported.
  const stageWidth = () => stage.current?.clientWidth ?? available;
  const currentWidth = width ?? available;

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setAvailable(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const device: Device | "" =
    DEVICES.find((entry) => entry.width === width)?.id ?? "";

  const fit = (next: number) =>
    next >= stageWidth() ? null : Math.max(MIN_WIDTH, Math.round(next));

  const showDevice = (next: Device) => {
    setWidth(DEVICES.find((entry) => entry.id === next)!.width);
  };

  // The preview stays centered, so an edge moves by half the width change.
  // Capturing the pointer keeps the drag alive over the iframe.
  const startDrag =
    (direction: 1 | -1) => (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = width ?? stageWidth();
      setDragging(true);
      const move = (moved: globalThis.PointerEvent) => {
        setWidth(fit(startWidth + direction * 2 * (moved.clientX - startX)));
      };
      const end = () => {
        setDragging(false);
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    };

  const nudge =
    (direction: 1 | -1) => (event: KeyboardEvent<HTMLDivElement>) => {
      const step =
        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const amount = event.shiftKey ? 64 : 16;
      setWidth(fit((width ?? stageWidth()) + direction * step * 2 * amount));
    };
  // The package rewrites the frame's URL with history.replaceState, which fires
  // no event the parent can observe, so the address bar reads it on an interval.
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const next = iframe.current?.contentWindow?.location.search ?? "";
        setSearch((current) => (current === next ? current : next));
      } catch {
        setSearch("");
      }
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex size-full flex-col">
      <div className="border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b px-2">
        <p className="bg-foreground/[0.04] text-muted-foreground min-w-0 flex-1 truncate rounded-md px-2.5 py-1 font-mono text-xs [font-variant-ligatures:none]">
          {SHOWN_ORIGIN}
          <span className="text-foreground">{decodeURIComponent(search)}</span>
        </p>
        <ToggleGroup
          type="single"
          size="sm"
          value={device}
          onValueChange={(value) => {
            if (value) showDevice(value as Device);
          }}
          aria-label="Preview width"
          className="bg-foreground/[0.05] dark:bg-foreground/[0.07] hidden shrink-0 gap-0.5 rounded-lg p-0.5 md:flex"
        >
          {DEVICES.map(({ id, label, Icon }) => (
            <ToggleGroupItem
              key={id}
              value={id}
              aria-label={label}
              title={label}
              className="text-muted-foreground hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground h-7 min-w-7 rounded-md! hover:bg-transparent"
            >
              <Icon />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] min-h-0 flex-1 md:px-5">
        <div ref={stage} className="h-full">
          <div
            className={cn(
              "relative mx-auto h-full",
              !dragging &&
                "transition-[max-width] duration-300 ease-out motion-reduce:transition-none",
            )}
            style={{ maxWidth: width ?? "100%" }}
          >
            <ResizeGrip
              side="left"
              value={currentWidth}
              max={available}
              onPointerDown={startDrag(-1)}
              onKeyDown={nudge(-1)}
            />
            <iframe
              ref={iframe}
              src={VARIANTS_DEMO_PATH}
              title="A recipe page with two undecided regions"
              className={cn(
                "bg-background border-foreground/10 block size-full border-0 md:border-x",
                dragging && "pointer-events-none",
              )}
            />
            <ResizeGrip
              side="right"
              value={currentWidth}
              max={available}
              onPointerDown={startDrag(1)}
              onKeyDown={nudge(1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
