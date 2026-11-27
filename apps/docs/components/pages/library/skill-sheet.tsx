"use client";

import { useRef } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowUpRightIcon,
  BookmarkCheckIcon,
  BookmarkIcon,
  TerminalIcon,
  XIcon,
} from "lucide-react";
import { skillSavedId } from "@/lib/library/saved-items";
import type { LibrarySkill } from "@/lib/library/skills-data";
import { cn } from "@/lib/utils";
import {
  LibraryDrawer,
  LibraryDrawerClose,
  LibraryDrawerContent,
  LibraryDrawerDescription,
  LibraryDrawerTitle,
} from "./library-drawer";
import { toggleLibrarySavedWithToast } from "./library-item-menu";
import { copyWithLibraryToast } from "./library-toast";
import { useLibrarySaved } from "./saved-store";
import {
  SkillInstall,
  SkillReferences,
  SkillRelated,
  SkillSections,
  SkillTrigger,
} from "./skill-details";
import { SkillMarkdown } from "./skill-markdown";
import { SkillText } from "./skill-text";

const button =
  "focus-visible:ring-ring inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4";

const tab =
  "text-muted-foreground hover:text-foreground data-active:bg-foreground/[0.06] data-active:text-foreground dark:data-active:bg-foreground/[0.09] focus-visible:ring-ring h-8 cursor-pointer rounded-full px-3.5 text-sm transition-colors outline-none focus-visible:ring-2";

function SkillSheetBody({
  skill,
  total,
  onSelect,
}: {
  skill: LibrarySkill;
  total: number;
  onSelect: (name: string) => void;
}) {
  const isSaved = useLibrarySaved().includes(skillSavedId(skill.name));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <LibraryDrawerTitle className="text-xl font-medium">
                {skill.title}
              </LibraryDrawerTitle>
              <LibraryDrawerDescription className="text-muted-foreground text-sm text-pretty">
                <SkillText text={skill.intro} />
              </LibraryDrawerDescription>
            </div>
            <LibraryDrawerClose
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] focus-visible:ring-ring -me-2 -mt-0.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
            >
              <XIcon aria-hidden className="size-4" />
            </LibraryDrawerClose>
          </div>

          <Tabs.Root
            defaultValue="overview"
            className="flex flex-1 flex-col gap-5"
          >
            <div className="flex items-center justify-between gap-4">
              <Tabs.List aria-label="Skill details" className="flex gap-1">
                <Tabs.Tab value="overview" className={tab}>
                  Overview
                </Tabs.Tab>
                <Tabs.Tab value="file" className={cn(tab, "font-mono")}>
                  SKILL.md
                </Tabs.Tab>
              </Tabs.List>
              <a
                href={skill.sourceHref}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-sm underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-2"
              >
                View repo
                <ArrowUpRightIcon aria-hidden className="size-3.5" />
                <span className="sr-only">on GitHub (opens in a new tab)</span>
              </a>
            </div>

            <Tabs.Panel
              value="overview"
              className="flex flex-col gap-6 outline-none"
            >
              <SkillInstall skill={skill} total={total} />
              <SkillTrigger skill={skill} />
              <SkillSections skill={skill} />
              <SkillReferences skill={skill} />
              <SkillRelated skill={skill} onSelect={onSelect} />
            </Tabs.Panel>
            <Tabs.Panel value="file" className="outline-none">
              <SkillMarkdown skill={skill} />
            </Tabs.Panel>
          </Tabs.Root>
        </div>
      </div>
      <div className="flex gap-2 border-t p-4">
        <button
          type="button"
          aria-label={`Install ${skill.title}: copy its install command`}
          onClick={() =>
            copyWithLibraryToast(skill.command, "Install command copied.")
          }
          className={cn(
            button,
            "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          <TerminalIcon aria-hidden />
          Install
        </button>
        <button
          type="button"
          aria-pressed={isSaved}
          onClick={() =>
            toggleLibrarySavedWithToast(skillSavedId(skill.name), skill.title)
          }
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
      </div>
    </div>
  );
}

/** `skill` stays set while the drawer closes, so its content holds through the exit animation. */
export function SkillSheet({
  skill,
  total,
  open,
  onOpenChange,
  onSelect,
}: {
  skill: LibrarySkill | null;
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (name: string) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <LibraryDrawer open={open} onOpenChange={onOpenChange}>
      <LibraryDrawerContent
        ref={popupRef}
        tabIndex={-1}
        initialFocus={popupRef}
        className="w-[30rem]"
      >
        {skill ? (
          <SkillSheetBody
            key={skill.name}
            skill={skill}
            total={total}
            onSelect={onSelect}
          />
        ) : null}
      </LibraryDrawerContent>
    </LibraryDrawer>
  );
}
