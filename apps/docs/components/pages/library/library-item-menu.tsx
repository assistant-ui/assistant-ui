"use client";

import Link from "next/link";
import {
  BookOpenIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  BotIcon,
  CheckIcon,
  InfoIcon,
  PlusIcon,
  TerminalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  setLibrarySavedOpen,
  toggleLibrarySavedItem,
  useLibrarySaved,
} from "./saved-store";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "./menu";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import { iconMenuTrigger } from "./library-item";
import { LibraryTooltip } from "./library-tooltip";

/** Saves the item or removes it from saved, and says which in a toast that opens the saved panel. */
export const toggleLibrarySavedWithToast = (id: string, label: string) => {
  const added = toggleLibrarySavedItem(id);
  libraryToast.success(
    added ? `${label} saved.` : `${label} removed from saved.`,
    {
      group: "saved",
      action: {
        label: "View saved",
        onClick: () => setLibrarySavedOpen(true),
      },
    },
  );
};

/** The plus button on a library item: save it, copy its install command or agent prompt, or go to its details or its docs. */
export function LibraryItemMenu({
  id,
  label,
  command,
  prompt,
  onDetails,
  docs,
  tooltipSide = "left",
  className,
}: {
  /** The item's id in the saved panel. */
  id: string;
  label: string;
  /** Left out for an item that is set up from its page. */
  command?: string;
  prompt: string;
  /** Opens the item's details. */
  onDetails: () => void;
  /** The item's docs page. */
  docs: string;
  tooltipSide?: "left" | "top";
  className?: string;
}) {
  const isSaved = useLibrarySaved().includes(id);

  return (
    <Menu>
      <LibraryTooltip side={tooltipSide} label="Add or copy">
        <MenuTrigger
          aria-label={`Options for ${label}${isSaved ? ", saved" : ""}`}
          className={cn(iconMenuTrigger, className)}
        >
          {isSaved ? <CheckIcon aria-hidden /> : <PlusIcon aria-hidden />}
        </MenuTrigger>
      </LibraryTooltip>
      <MenuContent side="bottom" align="end">
        <MenuItem onClick={() => toggleLibrarySavedWithToast(id, label)}>
          {isSaved ? (
            <BookmarkCheckIcon aria-hidden />
          ) : (
            <BookmarkIcon aria-hidden />
          )}
          {isSaved ? "Remove from saved" : "Save"}
        </MenuItem>
        <MenuSeparator />
        {command ? (
          <MenuItem
            onClick={() =>
              copyWithLibraryToast(command, "Install command copied.")
            }
          >
            <TerminalIcon aria-hidden />
            Copy install command
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => copyWithLibraryToast(prompt, "Agent prompt copied.")}
        >
          <BotIcon aria-hidden />
          Copy agent prompt
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={onDetails}>
          <InfoIcon aria-hidden />
          Details
        </MenuItem>
        <MenuLinkItem href={docs} render={<Link href={docs} />}>
          <BookOpenIcon aria-hidden />
          Docs
        </MenuLinkItem>
      </MenuContent>
    </Menu>
  );
}
