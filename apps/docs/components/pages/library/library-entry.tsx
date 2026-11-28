"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { LibraryBlock } from "@/lib/library/blocks-data";
import type { LibraryLink, LibrarySectionId } from "@/lib/library/library-data";
import { blockSavedId } from "@/lib/library/saved-items";
import { cn } from "@/lib/utils";
import { LibraryGlyph } from "./library-glyphs";
import { itemFrame } from "./library-item";
import { LibraryItemMenu } from "./library-item-menu";

/** An item's name as the link to its page; the click area covers the whole item. */
function LinkTitle({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
        <Link
          href={href}
          className="focus-visible:after:ring-ring underline-offset-4 outline-none group-hover/navlink:underline after:absolute after:-inset-x-2 after:inset-y-0 after:rounded-lg focus-visible:after:ring-2"
        >
          {children}
        </Link>
      </h3>
      <ArrowRightIcon
        aria-hidden
        className="text-muted-foreground size-3.5 shrink-0 self-center opacity-0 transition-opacity group-hover/navlink:opacity-100 motion-reduce:transition-none"
      />
    </div>
  );
}

/** A library item that lives on its own page: its name and one line about it. */
export function LinkRow({ link }: { link: LibraryLink }) {
  return (
    <li className="group/navlink relative flex min-w-0 items-start gap-2 py-2">
      <div className="min-w-0 flex-1">
        <LinkTitle href={link.href}>{link.name}</LinkTitle>
        <p
          className={cn(
            "text-muted-foreground mt-0.5",
            link.code
              ? "truncate font-mono text-xs leading-relaxed [font-variant-ligatures:none]"
              : "line-clamp-2 text-[13px] leading-relaxed",
          )}
        >
          {link.description}
        </p>
      </div>
      {link.id && link.prompt ? (
        <LibraryItemMenu
          id={link.id}
          label={link.name}
          prompt={link.prompt}
          tooltipSide="top"
          className="relative z-10 -mt-1 shrink-0"
          {...(link.command && { command: link.command })}
        />
      ) : null}
    </li>
  );
}

const BLOCK_IMAGE_SIZES =
  "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw";

/** A block as a card: its screenshot in the current mode, its name, and what it is. */
export function BlockCard({ block }: { block: LibraryBlock }) {
  return (
    <li className="group/navlink relative flex min-w-0 flex-col">
      <div className={cn(itemFrame, "rounded-[32px] p-5")}>
        <div className="bg-background relative aspect-[16/10] overflow-hidden rounded-xl">
          <LibraryItemMenu
            id={blockSavedId(block.slug)}
            label={block.title}
            prompt={block.prompt}
            className="bg-background/45 text-foreground hover:bg-background/70 focus-visible:bg-background/70 data-popup-open:bg-background/70 absolute top-3 right-3 z-10 backdrop-blur-md"
          />
          <Image
            src={block.image.light}
            alt=""
            fill
            sizes={BLOCK_IMAGE_SIZES}
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={block.image.dark}
            alt=""
            fill
            sizes={BLOCK_IMAGE_SIZES}
            className="hidden object-cover object-top dark:block"
          />
        </div>
      </div>
      <LinkTitle href={`/blocks/${block.slug}`} className="mt-3.5">
        {block.title}
      </LinkTitle>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {block.description}
      </p>
    </li>
  );
}

/** One kind of library item as a tile that opens its tab: its drawing, its count, its name, and what it is. */
export function SectionTile({
  id,
  title,
  description,
  count,
  onSelect,
}: {
  id: LibrarySectionId;
  title: string;
  description: string;
  count: number;
  onSelect: () => void;
}) {
  return (
    <li data-nav-glyph-motion className="group/navlink flex min-w-0">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          itemFrame,
          "focus-visible:ring-ring flex w-full cursor-pointer flex-col gap-5 rounded-[28px] p-5 text-left outline-none focus-visible:ring-2",
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="bg-background grid h-12 w-16 place-items-center rounded-xl">
            <LibraryGlyph id={id} />
          </span>
          <span className="text-muted-foreground text-sm tabular-nums">
            {count}
            <span className="sr-only"> items</span>
          </span>
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[13.5px] font-medium">{title}</span>
          <span className="text-muted-foreground text-[13px] leading-relaxed text-pretty">
            {description}
          </span>
        </span>
      </button>
    </li>
  );
}
