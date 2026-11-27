"use client";

import { useRef } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 40;

const roundButton =
  "bg-background/70 text-foreground ring-foreground/10 hover:bg-background focus-visible:ring-ring grid size-10 cursor-pointer place-items-center rounded-full ring-1 backdrop-blur-md transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-0 [&_svg]:size-5";

/** One mode's screenshots side by side, slid so `index` is in view. */
function Strip({
  shots,
  label,
  index,
  className,
}: {
  shots: readonly string[];
  label: string;
  index: number;
  className: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none",
        className,
      )}
      style={{ transform: `translateX(-${index * 100}%)` }}
    >
      {shots.map((src, i) => (
        <div
          key={src}
          aria-hidden={i !== index}
          className="[container-type:size] absolute inset-y-0 flex w-full items-center justify-center"
          style={{ left: `${i * 100}%` }}
        >
          <div className="rounded-document relative aspect-[16/10] w-[min(100cqw,160cqh)] overflow-hidden">
            <Image
              src={src}
              alt={`${label}, screenshot ${i + 1} of ${shots.length}`}
              fill
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Shows a starter's screenshots one at a time, at full size, for the current
 * color mode. Arrows, the arrow keys, and a horizontal swipe move between them.
 */
export function ScreenshotViewer({
  screenshots,
  label,
  index,
  onIndexChange,
  open,
  onOpenChange,
}: {
  screenshots: { light: readonly string[]; dark: readonly string[] };
  label: string;
  index: number;
  onIndexChange: (index: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const count = screenshots.light.length;
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const go = (next: number) => {
    if (next >= 0 && next < count) onIndexChange(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          forceRender
          className="fixed inset-0 z-[60] bg-black/70 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
        />
        <Dialog.Popup
          onClick={(event) => {
            if (swiped.current) {
              swiped.current = false;
              return;
            }
            // The popup covers the screen, so a click on its empty space stands in for the backdrop.
            if (
              !(event.target as Element).closest(
                "button, img, [data-viewer-keep]",
              )
            ) {
              onOpenChange(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") go(index - 1);
            if (event.key === "ArrowRight") go(index + 1);
          }}
          className="fixed inset-4 z-[60] flex flex-col items-center justify-center gap-4 transition-opacity duration-150 outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none sm:inset-8"
        >
          <Dialog.Title className="sr-only">{`${label} screenshots`}</Dialog.Title>
          <div className="flex w-full max-w-6xl items-center justify-between gap-4 text-sm text-white">
            <span data-viewer-keep className="tabular-nums" aria-live="polite">
              {index + 1} / {count}
            </span>
            <Dialog.Close aria-label="Close" className={roundButton}>
              <XIcon aria-hidden />
            </Dialog.Close>
          </div>
          <div className="relative flex min-h-0 w-full max-w-6xl flex-1 items-stretch gap-3">
            <button
              type="button"
              aria-label="Previous screenshot"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className={cn(
                roundButton,
                "absolute top-1/2 left-3 z-10 -translate-y-1/2 sm:static sm:translate-y-0 sm:self-center",
              )}
            >
              <ChevronLeftIcon aria-hidden />
            </button>
            <div
              className="relative min-h-0 flex-1 touch-pan-y overflow-hidden"
              onPointerDown={(event) => {
                swipeStart.current = event.clientX;
              }}
              onPointerUp={(event) => {
                if (swipeStart.current === null) return;
                const delta = event.clientX - swipeStart.current;
                swipeStart.current = null;
                swiped.current = Math.abs(delta) >= SWIPE_THRESHOLD_PX;
                if (delta <= -SWIPE_THRESHOLD_PX) go(index + 1);
                if (delta >= SWIPE_THRESHOLD_PX) go(index - 1);
              }}
              onPointerCancel={() => {
                swipeStart.current = null;
              }}
            >
              <Strip
                shots={screenshots.light}
                label={label}
                index={index}
                className="dark:hidden"
              />
              <Strip
                shots={screenshots.dark}
                label={label}
                index={index}
                className="hidden dark:block"
              />
            </div>
            <button
              type="button"
              aria-label="Next screenshot"
              disabled={index === count - 1}
              onClick={() => go(index + 1)}
              className={cn(
                roundButton,
                "absolute top-1/2 right-3 z-10 -translate-y-1/2 sm:static sm:translate-y-0 sm:self-center",
              )}
            >
              <ChevronRightIcon aria-hidden />
            </button>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show screenshot ${i + 1} of ${count}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className="focus-visible:ring-ring grid size-5 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2"
              >
                <span
                  className={cn(
                    "size-2 rounded-full transition-colors",
                    i === index ? "bg-white" : "bg-white/35",
                  )}
                />
              </button>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
