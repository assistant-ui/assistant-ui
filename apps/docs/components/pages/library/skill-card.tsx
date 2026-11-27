"use client";

import { skillSavedId } from "@/lib/library/saved-items";
import type { LibrarySkill } from "@/lib/library/skills-data";
import { cn } from "@/lib/utils";
import { ItemGlyph, ItemThumbnail, ItemTitle, itemFrame } from "./library-item";
import { LibraryItemMenu } from "./library-item-menu";
import { SkillGlyph } from "./skill-glyphs";

type SkillItemProps = {
  skill: LibrarySkill;
  onSelect: (name: string) => void;
};

function SkillMenu({
  skill,
  tooltipSide,
  className,
}: {
  skill: LibrarySkill;
  tooltipSide?: "left" | "top";
  className: string;
}) {
  return (
    <LibraryItemMenu
      id={skillSavedId(skill.name)}
      label={skill.title}
      command={skill.command}
      prompt={skill.prompt}
      className={className}
      {...(tooltipSide && { tooltipSide })}
    />
  );
}

/** A skill as a small card: its glyph, its name, one line on what it does, and the command that calls it. */
export function SkillCard({ skill, onSelect }: SkillItemProps) {
  return (
    <li data-nav-glyph-motion className="group/navlink relative flex min-w-0">
      <div
        className={cn(
          itemFrame,
          "flex w-full flex-col gap-5 rounded-[28px] p-5",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="bg-background grid h-12 w-16 place-items-center rounded-xl">
            <SkillGlyph name={skill.name} />
          </span>
          <SkillMenu
            skill={skill}
            tooltipSide="top"
            className="relative z-10 -me-1.5 -mt-1.5"
          />
        </div>
        <div className="flex flex-col gap-1">
          <ItemTitle
            label={skill.title}
            onSelect={() => onSelect(skill.name)}
          />
          <p className="text-muted-foreground text-[13px] leading-relaxed text-pretty">
            {skill.summary}
          </p>
        </div>
        <span className="text-muted-foreground mt-auto font-mono text-xs [font-variant-ligatures:none]">
          {skill.slash}
        </span>
      </div>
    </li>
  );
}

/** A skill's glyph in a small frame, as the saved panel shows it. */
export function SkillThumbnail({ name }: { name: string }) {
  return (
    <ItemThumbnail>
      <ItemGlyph>
        <SkillGlyph name={name} />
      </ItemGlyph>
    </ItemThumbnail>
  );
}

export function SkillRow({ skill, onSelect }: SkillItemProps) {
  return (
    <li
      data-nav-glyph-motion
      className="group/navlink relative flex min-w-0 items-center gap-4 py-2"
    >
      <div className={cn(itemFrame, "shrink-0 rounded-2xl p-1.5")}>
        <span className="bg-background grid h-11 w-14 place-items-center rounded-[10px] [&>svg]:h-8 [&>svg]:w-[2.667rem]">
          <SkillGlyph name={skill.name} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <ItemTitle label={skill.title} onSelect={() => onSelect(skill.name)} />
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[13px] leading-relaxed">
          {skill.summary}
        </p>
      </div>
      <SkillMenu
        skill={skill}
        tooltipSide="top"
        className="relative z-10 shrink-0"
      />
    </li>
  );
}
