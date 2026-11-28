"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Starter } from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import { ItemGlyph, ItemThumbnail, ItemTitle, itemFrame } from "./library-item";
import { overPreview } from "./library-icon-button";
import { StarterGlyph } from "./starter-glyphs";
import { StarterMenu } from "./starter-menu";

const SWIPE_INTERVAL_MS = 1800;

/** One mode's screenshots side by side, slid so `index` is in view. */
function ShotStrip({
  shots,
  index,
  sizes,
  className,
}: {
  shots: readonly string[];
  index: number;
  sizes: string;
  className: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 transition-transform duration-500 ease-out motion-reduce:transition-none",
        className,
      )}
      style={{ transform: `translateX(-${(index % shots.length) * 100}%)` }}
    >
      {shots.map((src, i) => (
        <div
          key={src}
          className="absolute inset-y-0 w-full"
          style={{ left: `${i * 100}%` }}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes={sizes}
            className="object-cover object-top"
          />
        </div>
      ))}
    </div>
  );
}

function StarterPreview({
  starter,
  sizes,
  index = 0,
}: {
  starter: Starter;
  sizes: string;
  /** Which screenshot to show, for a starter with screenshots in each mode. */
  index?: number;
}) {
  if (starter.screenshots) {
    return (
      <>
        <ShotStrip
          shots={starter.screenshots.light}
          index={index}
          sizes={sizes}
          className="flex dark:hidden"
        />
        <ShotStrip
          shots={starter.screenshots.dark}
          index={index}
          sizes={sizes}
          className="hidden dark:flex"
        />
      </>
    );
  }
  return starter.image ? (
    <Image
      src={starter.image}
      alt=""
      fill
      sizes={sizes}
      className="object-cover object-top"
    />
  ) : (
    <ItemGlyph>
      <StarterGlyph starter={starter} />
    </ItemGlyph>
  );
}

type StarterItemProps = {
  starter: Starter;
  onSelect: (starter: Starter) => void;
};

/** While the card is hovered or focused, steps through its screenshots; back to the first when it is not. */
function useShotIndex(count: number) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || count < 2) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % count),
      SWIPE_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [active, count]);

  const start = () => {
    if (active) return;
    setActive(true);
    if (count > 1) setIndex(1);
  };
  const stop = () => {
    setActive(false);
    setIndex(0);
  };

  return {
    index,
    handlers: {
      onPointerEnter: start,
      onPointerLeave: stop,
      onFocus: start,
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) stop();
      },
    },
  };
}

export function StarterCard({ starter, onSelect }: StarterItemProps) {
  const shotCount = starter.screenshots?.light.length ?? 0;
  const { index, handlers } = useShotIndex(shotCount);

  return (
    <li
      data-nav-glyph-motion
      className="group/navlink relative flex min-w-0 flex-col"
      {...handlers}
    >
      <div className={cn(itemFrame, "rounded-(--library-card) p-5")}>
        <div className="bg-background relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-(--library-card-inner)">
          <StarterMenu
            starter={starter}
            onDetails={() => onSelect(starter)}
            className={overPreview}
          />
          <StarterPreview
            starter={starter}
            index={index}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          />
          {shotCount > 1 ? (
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 opacity-0 transition-opacity group-hover/navlink:opacity-100 motion-reduce:transition-none"
            >
              {Array.from({ length: shotCount }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    i === index % shotCount
                      ? "bg-foreground/70"
                      : "bg-foreground/20",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <ItemTitle
        label={starter.label}
        onSelect={() => onSelect(starter)}
        className="mt-3.5"
      />
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {starter.description}
      </p>
    </li>
  );
}

/** A starter's small preview, as the list view and the saved panel show it. */
export function StarterThumbnail({ starter }: { starter: Starter }) {
  return (
    <ItemThumbnail>
      <StarterPreview starter={starter} sizes="96px" />
    </ItemThumbnail>
  );
}

export function StarterRow({ starter, onSelect }: StarterItemProps) {
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink relative flex min-w-0 items-center gap-4 py-2"
    >
      <StarterThumbnail starter={starter} />
      <div className="min-w-0 flex-1">
        <ItemTitle label={starter.label} onSelect={() => onSelect(starter)} />
        <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
          {starter.description}
        </p>
      </div>
      <StarterMenu
        starter={starter}
        onDetails={() => onSelect(starter)}
        tooltipSide="top"
        className="relative z-10 shrink-0"
      />
    </li>
  );
}
