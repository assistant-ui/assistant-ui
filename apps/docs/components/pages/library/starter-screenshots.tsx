"use client";

import { useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import type { Starter } from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import { ScreenshotViewer, type ViewerShot } from "./screenshot-viewer";

type Shots = { light: readonly ViewerShot[]; dark: readonly ViewerShot[] };

/** The desktop and phone shots composed together, or one shot. */
type Item =
  | { kind: "together"; phone: number }
  | { kind: "shot"; index: number };

const frame = "ring-foreground/10 overflow-hidden ring-1";
const lift =
  "shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.8)]";
const pressable =
  "focus-visible:ring-ring cursor-zoom-in outline-none focus-visible:ring-2";

/** Desktop shots, then phone shots, in each color mode. */
const collectShots = ({
  screenshots,
  phoneScreenshots,
}: Starter): Shots | null => {
  if (!screenshots) return null;
  const join = (mode: "light" | "dark") => [
    ...screenshots[mode].map((src) => ({ src, phone: false })),
    ...(phoneScreenshots?.[mode] ?? []).map((src) => ({ src, phone: true })),
  ];
  return { light: join("light"), dark: join("dark") };
};

const collectItems = (shots: Shots): Item[] => {
  const phone = shots.light.findIndex((shot) => shot.phone);
  const each = shots.light.map(
    (_, index) => ({ kind: "shot", index }) as const,
  );
  return phone > 0 ? [{ kind: "together", phone }, ...each] : each;
};

/** One shot in the current color mode, filling its parent. */
function ShotImage({
  shots,
  index,
  sizes,
}: {
  shots: Shots;
  index: number;
  sizes: string;
}) {
  return (
    <>
      <Image
        src={shots.light[index]!.src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover object-top dark:hidden"
      />
      <Image
        src={shots.dark[index]!.src}
        alt=""
        fill
        sizes={sizes}
        className="hidden object-cover object-top dark:block"
      />
    </>
  );
}

/**
 * The first desktop shot with the first phone shot standing over its right
 * edge, laid out in a 16:10 parent. With `onOpen`, each one opens in the viewer.
 */
function Together({
  shots,
  phone,
  label,
  onOpen,
}: {
  shots: Shots;
  phone: number;
  label?: string;
  onOpen?: (index: number) => void;
}) {
  const count = shots.light.length;
  const desktopClass = cn(
    frame,
    lift,
    "absolute top-[9%] left-0 aspect-[16/10] w-[82%] rounded-[2%/3.2%]",
  );
  const phoneClass = cn(
    frame,
    lift,
    "absolute inset-y-0 right-0 aspect-[390/844] rounded-[12%/5.5%]",
  );
  if (!onOpen) {
    return (
      <span className="absolute inset-[8%]">
        <span className={desktopClass}>
          <ShotImage shots={shots} index={0} sizes="96px" />
        </span>
        <span className={phoneClass}>
          <ShotImage shots={shots} index={phone} sizes="32px" />
        </span>
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Open ${label} screenshot 1 of ${count}`}
        onClick={() => onOpen(0)}
        className={cn(desktopClass, pressable)}
      >
        <ShotImage shots={shots} index={0} sizes="420px" />
      </button>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Open ${label} phone screenshot ${phone + 1} of ${count}`}
        onClick={() => onOpen(phone)}
        className={cn(phoneClass, pressable)}
      >
        <ShotImage shots={shots} index={phone} sizes="160px" />
      </button>
    </>
  );
}

/**
 * Fills the space it is given. The chosen item sits in the middle at its own
 * shape, as large as fits: a desktop shot, a phone shot, or the two together.
 */
function Stage({
  shots,
  item,
  label,
  onOpen,
}: {
  shots: Shots;
  item: Item;
  label: string;
  onOpen: (index: number) => void;
}) {
  const shell =
    "bg-foreground/[0.03] relative min-h-64 w-full flex-1 rounded-(--library-card-inner)";
  const area =
    "absolute inset-5 flex items-center justify-center [container-type:size]";
  const desktopBox = "relative aspect-[16/10] w-[min(100cqw,160cqh)]";
  if (item.kind === "together") {
    return (
      <div className={cn(frame, shell)}>
        <div className={area}>
          <div className={desktopBox}>
            <Together
              shots={shots}
              phone={item.phone}
              label={label}
              onOpen={onOpen}
            />
          </div>
        </div>
      </div>
    );
  }
  const phone = shots.light[item.index]!.phone;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`Open ${label} ${phone ? "phone " : ""}screenshot ${item.index + 1} of ${shots.light.length}`}
      onClick={() => onOpen(item.index)}
      className={cn(frame, pressable, shell)}
    >
      <span className={area}>
        <span
          className={cn(
            frame,
            lift,
            phone
              ? "relative aspect-[390/844] h-[min(100cqh,216.4cqw)] rounded-[12%/5.5%]"
              : cn(desktopBox, "rounded-[1.5%/2.4%]"),
          )}
        >
          <ShotImage
            shots={shots}
            index={item.index}
            sizes={phone ? "320px" : "(min-width: 640px) 528px, 100vw"}
          />
        </span>
      </span>
    </button>
  );
}

/**
 * A starter's screenshots in the current color mode: a large stage with a row
 * of thumbnails to pick what it shows. A click on the stage opens the shot in
 * the full-size viewer.
 */
export function StarterScreenshots({ starter }: { starter: Starter }) {
  const [selected, setSelected] = useState(0);
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState(false);
  const shots = collectShots(starter);
  if (!shots) return null;

  const items = collectItems(shots);
  const item = items[selected] ?? items[0]!;
  const open = (next: number) => {
    setIndex(next);
    setViewing(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Stage shots={shots} item={item} label={starter.label} onOpen={open} />
      <div
        role="group"
        aria-label="Screenshots"
        className="flex shrink-0 gap-2 overflow-x-auto p-0.5"
      >
        {items.map((entry, i) => {
          const phone =
            entry.kind === "shot" && shots.light[entry.index]!.phone;
          return (
            <button
              key={entry.kind === "shot" ? entry.index : "together"}
              type="button"
              aria-label={
                entry.kind === "together"
                  ? "Show desktop and phone together"
                  : `Show ${phone ? "phone " : ""}screenshot ${entry.index + 1} of ${shots.light.length}`
              }
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
              className={cn(
                "focus-visible:ring-ring relative h-14 shrink-0 cursor-pointer overflow-hidden rounded-md outline-none focus-visible:ring-2",
                phone ? "aspect-[390/844]" : "aspect-[16/10]",
                entry.kind === "together" && "bg-foreground/[0.03]",
                i === selected
                  ? "ring-foreground ring-2"
                  : "ring-foreground/10 opacity-70 ring-1 transition-opacity hover:opacity-100",
              )}
            >
              {entry.kind === "together" ? (
                <Together shots={shots} phone={entry.phone} />
              ) : (
                <ShotImage shots={shots} index={entry.index} sizes="96px" />
              )}
            </button>
          );
        })}
      </div>
      <ScreenshotViewer
        screenshots={shots}
        label={starter.label}
        index={index}
        onIndexChange={setIndex}
        open={viewing}
        onOpenChange={setViewing}
      />
    </div>
  );
}

/** A starter's recording in the current color mode, on the same stage as a desktop screenshot, with the browser's own playback controls. */
export function StarterRecording({ starter }: { starter: Starter }) {
  const mode = useTheme().resolvedTheme === "dark" ? "dark" : "light";
  if (!starter.recording) return null;
  const { video, poster } = starter.recording[mode];

  return (
    <div
      className={cn(
        frame,
        "bg-foreground/[0.03] relative min-h-64 w-full flex-1 rounded-(--library-card-inner)",
      )}
    >
      <div className="[container-type:size] absolute inset-5 flex items-center justify-center">
        <video
          key={mode}
          src={video}
          poster={poster}
          controls
          muted
          playsInline
          preload="none"
          aria-label={`${starter.label} recording`}
          className={cn(
            frame,
            lift,
            "bg-background aspect-[16/10] w-[min(100cqw,160cqh)] rounded-[1.5%/2.4%]",
          )}
        />
      </div>
    </div>
  );
}
