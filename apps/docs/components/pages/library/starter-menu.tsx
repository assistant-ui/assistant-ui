"use client";

import {
  BotIcon,
  CheckIcon,
  PlusIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  TerminalIcon,
} from "lucide-react";
import {
  starterCommand,
  starterId,
  starterPrompt,
  type Starter,
} from "@/lib/library/starters-data";
import { cn } from "@/lib/utils";
import {
  setLibrarySavedOpen,
  toggleLibrarySavedItem,
  useLibrarySaved,
} from "./saved-store";
import {
  LibraryMenu,
  LibraryMenuContent,
  LibraryMenuItem,
  LibraryMenuSeparator,
  LibraryMenuTrigger,
} from "./library-menu";
import { copyWithLibraryToast, libraryToast } from "./library-toast";
import { LibraryTooltip } from "./library-tooltip";

export function StarterMenu({
  starter,
  tooltipSide = "left",
  className,
}: {
  starter: Starter;
  tooltipSide?: "left" | "top";
  className?: string;
}) {
  const id = starterId(starter);
  const isSaved = useLibrarySaved().includes(id);

  return (
    <LibraryMenu>
      <LibraryTooltip side={tooltipSide} label="Add or copy">
        <LibraryMenuTrigger
          aria-label={`Options for ${starter.label}${isSaved ? ", saved" : ""}`}
          className={cn(
            "bg-background/45 text-foreground ring-foreground/10 hover:bg-background/70 data-popup-open:bg-background/70 size-8 rounded-full ring-1 backdrop-blur-md",
            className,
          )}
        >
          {isSaved ? <CheckIcon aria-hidden /> : <PlusIcon aria-hidden />}
        </LibraryMenuTrigger>
      </LibraryTooltip>
      <LibraryMenuContent side="bottom" align="end">
        <LibraryMenuItem
          onClick={() => {
            const added = toggleLibrarySavedItem(id);
            libraryToast.success(
              added
                ? `${starter.label} saved.`
                : `${starter.label} removed from saved.`,
              {
                group: "saved",
                action: {
                  label: "View saved",
                  onClick: () => setLibrarySavedOpen(true),
                },
              },
            );
          }}
        >
          {isSaved ? (
            <BookmarkCheckIcon aria-hidden />
          ) : (
            <BookmarkIcon aria-hidden />
          )}
          {isSaved ? "Remove from saved" : "Save"}
        </LibraryMenuItem>
        <LibraryMenuSeparator />
        <LibraryMenuItem
          onClick={() =>
            copyWithLibraryToast(
              starterCommand(starter),
              "Install command copied.",
            )
          }
        >
          <TerminalIcon aria-hidden />
          Copy install command
        </LibraryMenuItem>
        <LibraryMenuItem
          onClick={() =>
            copyWithLibraryToast(starterPrompt(starter), "Agent prompt copied.")
          }
        >
          <BotIcon aria-hidden />
          Copy agent prompt
        </LibraryMenuItem>
      </LibraryMenuContent>
    </LibraryMenu>
  );
}
