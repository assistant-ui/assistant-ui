"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  BotIcon,
  TerminalIcon,
  XIcon,
} from "lucide-react";
import { getLibrarySavedItems } from "@/lib/library/saved-items";
import { cn } from "@/lib/utils";
import { LibraryCopyButton } from "./library-copy-button";
import {
  LibraryDialog,
  LibraryDialogClose,
  LibraryDialogContent,
  LibraryDialogDescription,
  LibraryDialogTitle,
} from "./library-dialog";
import { LibraryIconButton } from "./library-icon-button";
import { toggleLibrarySavedWithToast } from "./library-item-menu";
import { LibraryKindLabel } from "./library-kind";
import { LibraryMark } from "./library-mark";
import { GroupRow, RowGroup } from "./library-row-group";
import { useLibrarySaved } from "./saved-store";

/** What the details dialog shows for an item that has no drawer or dialog of its own. */
export type LibraryDetails = {
  /** The item's id in the saved panel. */
  id: string;
  name: string;
  description: string;
  mark?: string;
  image?: { light: string; dark: string };
  command?: string;
  prompt: string;
  /** The item's docs page. */
  docs: string;
};

const button =
  "focus-visible:ring-ring inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-(--library-control) px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

function DetailsBody({ item }: { item: LibraryDetails }) {
  const isSaved = useLibrarySaved().includes(item.id);
  const kind = getLibrarySavedItems([item.id])[0]?.kind;

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-start gap-3">
        <span className="bg-foreground/[0.04] dark:bg-foreground/[0.06] relative grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-(--library-card-inner)">
          {item.image ? (
            <>
              <Image
                src={item.image.light}
                alt=""
                fill
                sizes="56px"
                className="object-cover object-top dark:hidden"
              />
              <Image
                src={item.image.dark}
                alt=""
                fill
                sizes="56px"
                className="hidden object-cover object-top dark:block"
              />
            </>
          ) : (
            <LibraryMark mark={item.mark} name={item.name} large />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <LibraryDialogTitle className="text-lg leading-6 font-medium">
            {item.name}
          </LibraryDialogTitle>
          {kind ? <LibraryKindLabel kind={kind} /> : null}
        </div>
        <LibraryDialogClose
          render={<LibraryIconButton tooltip="Close" className="-me-1 -mt-1" />}
        >
          <XIcon aria-hidden />
        </LibraryDialogClose>
      </div>
      {item.description ? (
        <LibraryDialogDescription className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {item.description}
        </LibraryDialogDescription>
      ) : null}
      <RowGroup title="Install">
        {item.command ? (
          <GroupRow
            icon={<TerminalIcon aria-hidden />}
            label="Install command"
            value={
              <span className="truncate font-mono text-xs [font-variant-ligatures:none]">
                {item.command}
              </span>
            }
            action={
              <LibraryCopyButton
                text={item.command}
                label="Copy install command"
                className="-me-1.5"
              />
            }
          />
        ) : null}
        <GroupRow
          icon={<BotIcon aria-hidden />}
          label="Agent prompt"
          value={<span className="truncate">{item.prompt}</span>}
          action={
            <LibraryCopyButton
              text={item.prompt}
              label="Copy agent prompt"
              className="-me-1.5"
            />
          }
        />
      </RowGroup>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => toggleLibrarySavedWithToast(item.id, item.name)}
          className={cn(
            button,
            "bg-foreground/[0.06] hover:bg-foreground/[0.1]",
          )}
        >
          {isSaved ? (
            <BookmarkCheckIcon aria-hidden />
          ) : (
            <BookmarkIcon aria-hidden />
          )}
          {isSaved ? "Remove from saved" : "Save"}
        </button>
        <Link
          href={item.docs}
          className={cn(
            button,
            "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          Open docs
          <ArrowRightIcon aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** A library item's details: what it is, how to install it, and where its docs are. */
export function LibraryItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: LibraryDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <LibraryDialog open={open} onOpenChange={onOpenChange}>
      <LibraryDialogContent
        ref={popupRef}
        tabIndex={-1}
        initialFocus={popupRef}
        className="sm:w-[32rem]"
      >
        {item ? <DetailsBody key={item.id} item={item} /> : null}
      </LibraryDialogContent>
    </LibraryDialog>
  );
}
