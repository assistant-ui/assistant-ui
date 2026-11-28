"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { BotIcon, TerminalIcon } from "lucide-react";
import type { LibraryEntry } from "@/lib/library/library-data";
import { blockSavedId, getLibrarySavedItems } from "@/lib/library/saved-items";
import { cn } from "@/lib/utils";
import { ComponentIcon } from "./component-icons";
import { LibraryDrawer, LibraryDrawerContent } from "./library-drawer";
import { LibraryFacts } from "./library-facts";
import { ItemThumbnail } from "./library-item";
import { LibraryMark } from "./library-mark";
import {
  SheetFooter,
  SheetHeader,
  sheetButton,
  sheetPrimary,
} from "./library-sheet";
import { copyWithLibraryToast } from "./library-toast";

/** What the details drawer shows for an item that has no drawer or dialog of its own. */
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
  /** The item's own page on the site, when that is not its docs page. */
  page?: string;
};

/** An entry's details; absent for one that opens something else, or that cannot be saved or copied. */
export const libraryDetails = (
  entry: LibraryEntry,
): LibraryDetails | undefined => {
  if (entry.kind === "block") {
    const { block } = entry;
    return {
      id: blockSavedId(block.slug),
      name: block.title,
      description: block.description,
      image: block.image,
      prompt: block.prompt,
      docs: `/blocks/${block.slug}`,
    };
  }
  if (entry.kind !== "link") return undefined;
  const { link } = entry;
  if (!link.id || !link.prompt) return undefined;
  return {
    id: link.id,
    name: link.name,
    // A row whose second line is a command says nothing more in prose.
    description: link.code ? "" : link.description,
    prompt: link.prompt,
    docs: link.docs ?? link.href,
    ...(link.docs && link.docs !== link.href && { page: link.href }),
    ...(link.mark && { mark: link.mark }),
    ...(link.command && { command: link.command }),
  };
};

function DetailsBody({
  item,
  previous,
  next,
  onItemChange,
  onGo,
}: {
  item: LibraryDetails;
  previous: LibraryDetails | undefined;
  next: LibraryDetails | undefined;
  onItemChange: (item: LibraryDetails) => void;
  onGo: (factId: string) => void;
}) {
  const { command, prompt } = item;
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [item.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="flex flex-1 flex-col gap-6 p-6">
          <SheetHeader
            thumbnail={
              <ItemThumbnail>
                {item.image ? (
                  <>
                    <Image
                      src={item.image.light}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover object-top dark:hidden"
                    />
                    <Image
                      src={item.image.dark}
                      alt=""
                      fill
                      sizes="96px"
                      className="hidden object-cover object-top dark:block"
                    />
                  </>
                ) : item.mark ? (
                  <LibraryMark mark={item.mark} name={item.name} large />
                ) : (
                  <ComponentIcon
                    id={item.id}
                    className="size-5"
                    fallback={
                      <LibraryMark mark={undefined} name={item.name} large />
                    }
                  />
                )}
              </ItemThumbnail>
            }
            title={item.name}
            kind={getLibrarySavedItems([item.id])[0]?.kind}
            description={item.description}
            previous={
              previous && {
                label: previous.name,
                go: () => onItemChange(previous),
              }
            }
            next={next && { label: next.name, go: () => onItemChange(next) }}
          />
          <LibraryFacts
            id={item.id}
            name={item.name}
            command={command}
            prompt={prompt}
            docs={item.docs}
            page={item.page}
            onGo={onGo}
          />
        </div>
      </div>
      <SheetFooter id={item.id} label={item.name}>
        {command ? (
          <button
            type="button"
            aria-label={`Install ${item.name}: copy its install command`}
            onClick={() =>
              copyWithLibraryToast(command, "Install command copied.")
            }
            className={cn(sheetButton, sheetPrimary)}
          >
            <TerminalIcon aria-hidden />
            Install
          </button>
        ) : (
          <button
            type="button"
            onClick={() => copyWithLibraryToast(prompt, "Agent prompt copied.")}
            className={cn(sheetButton, sheetPrimary)}
          >
            <BotIcon aria-hidden />
            Copy agent prompt
          </button>
        )}
      </SheetFooter>
    </div>
  );
}

/**
 * The drawer a library item opens in when it has none of its own, laid out
 * like a starter's. `items` is the list on screen, in order, which the arrows
 * step through.
 */
export function LibraryItemSheet({
  item,
  items,
  onItemChange,
  onGo,
  open,
  onOpenChange,
}: {
  item: LibraryDetails | null;
  items: readonly LibraryDetails[];
  onItemChange: (item: LibraryDetails) => void;
  /** Opens another library item, by the id its facts are kept under. */
  onGo: (factId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const index = item ? items.findIndex((entry) => entry.id === item.id) : -1;
  return (
    <LibraryDrawer open={open} onOpenChange={onOpenChange}>
      <LibraryDrawerContent
        ref={popupRef}
        tabIndex={-1}
        initialFocus={popupRef}
        className="w-[30rem]"
      >
        {item ? (
          <DetailsBody
            item={item}
            previous={index > 0 ? items[index - 1] : undefined}
            next={index === -1 ? undefined : items[index + 1]}
            onItemChange={onItemChange}
            onGo={onGo}
          />
        ) : null}
      </LibraryDrawerContent>
    </LibraryDrawer>
  );
}
