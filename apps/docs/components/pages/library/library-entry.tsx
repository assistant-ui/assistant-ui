"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { LibraryBlock } from "@/lib/library/blocks-data";
import type { LibraryLink, LibrarySectionId } from "@/lib/library/library-data";
import { cn } from "@/lib/utils";
import { overPreview } from "./library-icon-button";
import { LibraryGlyph } from "./library-glyphs";
import { itemFrame } from "./library-item";
import { libraryDetails, type LibraryDetails } from "./library-item-sheet";
import { LibraryItemMenu } from "./library-item-menu";
import { LibraryMark } from "./library-mark";

const titleTarget =
  "focus-visible:after:ring-ring underline-offset-4 outline-none group-hover/navlink:underline after:absolute after:-inset-x-2 after:inset-y-0 after:rounded-lg focus-visible:after:ring-2";

/**
 * An item's name, whose click area covers the whole item. It opens the item's
 * details when it has them, and otherwise is the link to its page.
 */
function EntryTitle({
  href,
  onSelect,
  className,
  children,
}: {
  href: string;
  onSelect: (() => void) | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
        {onSelect ? (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onSelect}
            className={cn(titleTarget, "cursor-pointer text-left")}
          >
            {children}
          </button>
        ) : (
          <Link href={href} className={titleTarget}>
            {children}
          </Link>
        )}
      </h3>
      <ArrowRightIcon
        aria-hidden
        className="text-muted-foreground size-3.5 shrink-0 self-center opacity-0 transition-opacity group-hover/navlink:opacity-100 motion-reduce:transition-none"
      />
    </div>
  );
}

/** A library item as a row: its name and one line about it. */
export function LinkRow({
  link,
  onDetails,
}: {
  link: LibraryLink;
  /** Opens the item's details. */
  onDetails: (details: LibraryDetails) => void;
}) {
  const description = (
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
  );
  const details = libraryDetails({ kind: "link", link });
  const open = details ? () => onDetails(details) : undefined;
  const menu = (className: string) =>
    details ? (
      <LibraryItemMenu
        id={details.id}
        label={details.name}
        prompt={details.prompt}
        docs={details.docs}
        onDetails={() => onDetails(details)}
        tooltipSide="top"
        className={className}
        {...(details.command && { command: details.command })}
      />
    ) : null;

  // A row with a mark is drawn like a skill's: the mark in a framed preview box.
  if (link.mark) {
    return (
      <li
        data-nav-glyph-motion
        className="group/navlink relative flex min-w-0 items-center gap-4 py-2"
      >
        <div
          className={cn(itemFrame, "shrink-0 rounded-(--library-thumb) p-1.5")}
        >
          <span className="bg-background grid h-11 w-14 place-items-center rounded-(--library-thumb-inner)">
            <LibraryMark mark={link.mark} name={link.name} large />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <EntryTitle href={link.href} onSelect={open}>
            {link.name}
          </EntryTitle>
          {description}
        </div>
        {menu("relative z-10 shrink-0")}
      </li>
    );
  }

  return (
    <li className="group/navlink relative flex min-w-0 items-start gap-2 py-2">
      <div className="min-w-0 flex-1">
        <EntryTitle href={link.href} onSelect={open}>
          {link.name}
        </EntryTitle>
        {description}
      </div>
      {menu("relative z-10 -mt-1 shrink-0")}
    </li>
  );
}

const BLOCK_IMAGE_SIZES =
  "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw";

/** A block as a card: its screenshot in the current mode, its name, and what it is. */
export function BlockCard({
  block,
  onDetails,
}: {
  block: LibraryBlock;
  /** Opens the block's details. */
  onDetails: (details: LibraryDetails) => void;
}) {
  const details = libraryDetails({ kind: "block", block })!;
  const { docs } = details;
  return (
    <li className="group/navlink relative flex min-w-0 flex-col">
      <div className={cn(itemFrame, "rounded-(--library-card) p-5")}>
        <div className="bg-background relative aspect-[16/10] overflow-hidden rounded-(--library-card-inner)">
          <LibraryItemMenu
            id={details.id}
            label={block.title}
            prompt={block.prompt}
            docs={docs}
            onDetails={() => onDetails(details)}
            className={overPreview}
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
      <EntryTitle
        href={docs}
        onSelect={() => onDetails(details)}
        className="mt-3.5"
      >
        {block.title}
      </EntryTitle>
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
          "focus-visible:ring-ring flex w-full cursor-pointer flex-col gap-5 rounded-(--library-card) p-5 text-left outline-none focus-visible:ring-2",
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="bg-background grid h-12 w-16 place-items-center rounded-(--library-card-inner)">
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
