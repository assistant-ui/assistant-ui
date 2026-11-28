"use client";

import { useRef } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryIconButton } from "./library-icon-button";

const SWIPE_THRESHOLD_PX = 40;

const roundButton =
  "bg-background/70 text-foreground ring-foreground/10 hover:bg-background dark:hover:bg-background size-10 ring-1 backdrop-blur-md disabled:opacity-0";

export type ViewerShot = { src: string; phone: boolean };

/** One mode's screenshots side by side, slid so `index` is in view. */
function Strip({
  shots,
  label,
  index,
  className,
}: {
  shots: readonly ViewerShot[];
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
      {shots.map(({ src, phone }, i) => (
        <div
          key={src}
          aria-hidden={i !== index}
          className="[container-type:size] absolute inset-y-0 flex w-full items-center justify-center"
          style={{ left: `${i * 100}%` }}
        >
          <div
            className={cn(
              "rounded-document relative overflow-hidden",
              phone
                ? "aspect-[390/844] h-[min(100cqh,216.4cqw)]"
                : "aspect-[16/10] w-[min(100cqw,160cqh)]",
            )}
          >
            <Image
              src={src}
              alt={`${label}, ${phone ? "phone " : ""}screenshot ${i + 1} of ${shots.length}`}
              fill
              sizes={
                phone
                  ? "(min-width: 640px) 420px, 100vw"
                  : "(min-width: 1280px) 1200px, 100vw"
              }
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
  screenshots: { light: readonly ViewerShot[]; dark: readonly ViewerShot[] };
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
          className="fixed inset-0 z-50 bg-black/70 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
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
          className="fixed inset-4 z-50 flex flex-col items-center justify-center gap-4 transition-opacity duration-150 outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none sm:inset-8"
        >
          <Dialog.Title className="sr-only">{`${label} screenshots`}</Dialog.Title>
          <div className="flex w-full max-w-6xl items-center justify-between gap-4 text-sm text-white">
            <span data-viewer-keep className="tabular-nums" aria-live="polite">
              {index + 1} / {count}
            </span>
            <Dialog.Close
              render={
                <LibraryIconButton
                  tooltip="Close"
                  side="bottom"
                  className={roundButton}
                />
              }
            >
              <XIcon aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <div className="relative flex min-h-0 w-full max-w-6xl flex-1 items-stretch gap-3">
            <span className="absolute top-1/2 left-3 z-10 -translate-y-1/2 sm:static sm:translate-y-0 sm:self-center">
              <LibraryIconButton
                tooltip="Previous screenshot"
                disabled={index === 0}
                onClick={() => go(index - 1)}
                className={roundButton}
              >
                <ChevronLeftIcon aria-hidden className="size-5" />
              </LibraryIconButton>
            </span>
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
            <span className="absolute top-1/2 right-3 z-10 -translate-y-1/2 sm:static sm:translate-y-0 sm:self-center">
              <LibraryIconButton
                tooltip="Next screenshot"
                disabled={index === count - 1}
                onClick={() => go(index + 1)}
                className={roundButton}
              >
                <ChevronRightIcon aria-hidden className="size-5" />
              </LibraryIconButton>
            </span>
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
