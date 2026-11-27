"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  BookmarkIcon,
  BotIcon,
  ChevronDownIcon,
  CopyIcon,
  TerminalIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import {
  getLibrarySavedItems,
  librarySavedPrompt,
  type LibrarySavedItem,
  type LibrarySavedPreview,
} from "@/lib/library/saved-items";
import { cn } from "@/lib/utils";
import {
  clearLibrarySaved,
  removeLibrarySavedItem,
  setLibrarySavedOpen,
  useLibrarySaved,
  useLibrarySavedOpen,
} from "./saved-store";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "./menu";
import { LibraryKindLabel } from "./library-kind";
import { SkillThumbnail } from "./skill-card";
import { StarterThumbnail } from "./starter-card";
import { copyWithLibraryToast } from "./library-toast";

const button =
  "focus-visible:ring-ring inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

export function LibrarySavedButton({ className }: { className?: string }) {
  const count = useLibrarySaved().length;
  return (
    <button
      type="button"
      onClick={() => setLibrarySavedOpen(true)}
      aria-label={`Open saved, ${count} ${count === 1 ? "item" : "items"}`}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring relative grid size-9 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2",
        className,
      )}
    >
      <BookmarkIcon aria-hidden className="size-4" />
      {count > 0 ? (
        <span
          aria-hidden
          className="bg-foreground text-background absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-medium tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SavedPreview({ preview }: { preview: LibrarySavedPreview }) {
  return preview.kind === "starter" ? (
    <StarterThumbnail starter={preview.starter} />
  ) : (
    <SkillThumbnail name={preview.skill} />
  );
}

/** The saved panel; mounted once for every library page. `items` are the saveable items the server reads, such as skills. */
export function LibrarySavedSheet({
  items: more,
}: {
  items?: readonly LibrarySavedItem[];
}) {
  const items = getLibrarySavedItems(useLibrarySaved(), more);
  const open = useLibrarySavedOpen();
  const commands = items.map((item) => item.command).join("\n");

  return (
    <Dialog.Root open={open} onOpenChange={setLibrarySavedOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="bg-background ring-foreground/10 fixed inset-y-2 right-2 z-50 flex w-[min(24rem,calc(100vw-1rem))] flex-col rounded-xl shadow-xl ring-1 transition-transform duration-200 outline-none data-ending-style:translate-x-[calc(100%+1rem)] data-starting-style:translate-x-[calc(100%+1rem)] motion-reduce:transition-none">
          <div className="flex items-start justify-between gap-4 p-5 pb-3">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-base font-medium">
                Saved
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {items.length === 0
                  ? "Save a starter or a skill from its card's menu."
                  : `${items.length} ${items.length === 1 ? "item" : "items"}`}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close saved"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring -me-1.5 grid size-8 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
            >
              <XIcon aria-hidden className="size-4" />
            </Dialog.Close>
          </div>
          {items.length > 0 ? (
            <>
              <ul className="min-h-0 flex-1 overflow-y-auto px-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="hover:bg-foreground/[0.025] flex items-center gap-3 rounded-xl py-2 ps-2 pe-1"
                  >
                    <SavedPreview preview={item.preview} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {item.name}
                      </span>
                      <LibraryKindLabel kind={item.kind} />
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from saved`}
                      onClick={() => removeLibrarySavedItem(item.id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring grid size-7 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
                    >
                      <XIcon aria-hidden className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 border-t p-4">
                <button
                  type="button"
                  onClick={clearLibrarySaved}
                  className={cn(
                    button,
                    "bg-foreground/[0.06] hover:bg-foreground/[0.1] flex-1",
                  )}
                >
                  <Trash2Icon aria-hidden />
                  Clear all
                </button>
                <Menu>
                  <MenuTrigger
                    className={cn(
                      button,
                      "bg-foreground text-background hover:bg-foreground/90 focus-visible:bg-foreground/90 data-popup-open:bg-foreground/90 flex flex-1",
                    )}
                  >
                    <CopyIcon aria-hidden />
                    Copy
                    <ChevronDownIcon aria-hidden className="opacity-70" />
                  </MenuTrigger>
                  <MenuContent side="top" align="end">
                    <MenuItem
                      onClick={() =>
                        copyWithLibraryToast(
                          commands,
                          items.length === 1
                            ? "Install command copied."
                            : "Install commands copied.",
                        )
                      }
                    >
                      <TerminalIcon aria-hidden />
                      {items.length === 1
                        ? "Copy install command"
                        : "Copy install commands"}
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        copyWithLibraryToast(
                          librarySavedPrompt(items),
                          "Agent prompt copied.",
                        )
                      }
                    >
                      <BotIcon aria-hidden />
                      Copy agent prompt
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
            </>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
