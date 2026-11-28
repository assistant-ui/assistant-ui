"use client";

import type { ReactNode } from "react";
import {
  ArrowUpRightIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import type { LibraryKind } from "@/lib/library/saved-items";
import { cn } from "@/lib/utils";
import {
  LibraryDrawerClose,
  LibraryDrawerDescription,
  LibraryDrawerTitle,
} from "./library-drawer";
import { LibraryIconButton } from "./library-icon-button";
import { toggleLibrarySavedWithToast } from "./library-item-menu";
import { LibraryKindLabel } from "./library-kind";
import { GroupRow } from "./library-row-group";
import { useLibrarySaved } from "./saved-store";

// The parts every details drawer in the library shares, so a starter, a
// runtime, and a block are laid out the same way.

export const sheetButton =
  "focus-visible:ring-ring inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-(--library-control) px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

export const sheetPrimary =
  "bg-foreground text-background hover:bg-foreground/90 flex-1";

/** The item one step away in the list on screen. */
export type SheetStep = { label: string; go: () => void };

/** The top of a details drawer: preview, name, tags, the arrows and close, then what the item is. */
export function SheetHeader({
  thumbnail,
  title,
  kind,
  badge,
  description,
  previous,
  next,
}: {
  thumbnail: ReactNode;
  title: string;
  kind: LibraryKind | undefined;
  /** Sits after the kind, such as a status badge. */
  badge?: ReactNode;
  description: string;
  previous: SheetStep | undefined;
  next: SheetStep | undefined;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {thumbnail}
        <div className="flex min-w-0 flex-1 flex-col gap-1 self-center">
          <LibraryDrawerTitle className="text-lg leading-6 font-medium">
            {title}
          </LibraryDrawerTitle>
          {kind || badge ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {kind ? <LibraryKindLabel kind={kind} /> : null}
              {badge}
            </div>
          ) : null}
        </div>
        <div className="-me-2 -mt-0.5 flex shrink-0 items-center">
          <LibraryIconButton
            tooltip={previous ? `Previous: ${previous.label}` : "Previous"}
            side="bottom"
            disabled={!previous}
            focusableWhenDisabled
            onClick={() => previous?.go()}
          >
            <ChevronLeftIcon aria-hidden />
          </LibraryIconButton>
          <LibraryIconButton
            tooltip={next ? `Next: ${next.label}` : "Next"}
            side="bottom"
            disabled={!next}
            focusableWhenDisabled
            onClick={() => next?.go()}
          >
            <ChevronRightIcon aria-hidden />
          </LibraryIconButton>
          <LibraryDrawerClose
            render={<LibraryIconButton tooltip="Close" side="bottom" />}
          >
            <XIcon aria-hidden />
          </LibraryDrawerClose>
        </div>
      </div>
      {description ? (
        <LibraryDrawerDescription className="text-muted-foreground text-sm text-pretty">
          {description}
        </LibraryDrawerDescription>
      ) : null}
    </div>
  );
}

/** The bottom of a details drawer: how to get the item, then Save. */
export function SheetFooter({
  id,
  label,
  children,
}: {
  /** The item's id in the saved panel. */
  id: string;
  label: string;
  /** The first button: the way to get the item. */
  children: ReactNode;
}) {
  const isSaved = useLibrarySaved().includes(id);
  return (
    <div className="flex gap-2 border-t p-4">
      {children}
      <button
        type="button"
        aria-pressed={isSaved}
        onClick={() => toggleLibrarySavedWithToast(id, label)}
        className={cn(
          sheetButton,
          "bg-foreground/[0.06] hover:bg-foreground/[0.1] flex-1",
        )}
      >
        {isSaved ? (
          <BookmarkCheckIcon aria-hidden />
        ) : (
          <BookmarkIcon aria-hidden />
        )}
        {isSaved ? "Remove from saved" : "Save"}
      </button>
    </div>
  );
}

/** A row that names a place and opens it in a new tab. */
export function SheetLinkRow({
  icon,
  label,
  href,
  text = href.replace(/^https:\/\//, ""),
  tooltip,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  /** What the row shows for the address; the address itself when left out. */
  text?: string;
  tooltip: string;
}) {
  return (
    <GroupRow
      icon={icon}
      label={label}
      value={
        <span className="truncate font-mono text-xs [font-variant-ligatures:none]">
          {text}
        </span>
      }
      action={
        <LibraryIconButton
          tooltip={tooltip}
          aria-label={`${tooltip} (opens in a new tab)`}
          nativeButton={false}
          render={<a href={href} target="_blank" rel="noreferrer" />}
          className="-me-1.5"
        >
          <ArrowUpRightIcon aria-hidden />
        </LibraryIconButton>
      }
    />
  );
}
