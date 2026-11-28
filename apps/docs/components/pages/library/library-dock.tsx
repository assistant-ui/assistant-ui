"use client";

import { PaletteIcon, SettingsIcon } from "lucide-react";
import type { LibrarySkill } from "@/lib/library/skills-data";
import { LibraryTooltip } from "./library-tooltip";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "./menu";
import { SkillGlyph } from "./skill-glyphs";

/**
 * The library's one floating button, at the bottom corner of the screen: the
 * skills for the open tab, and the way into the appearance settings.
 */
export function LibraryDock({
  title,
  skills,
  onSkill,
  onAppearance,
}: {
  /** What the open tab is called, for the skills heading. */
  title: string;
  skills: readonly LibrarySkill[];
  onSkill: (skill: LibrarySkill) => void;
  onAppearance: () => void;
}) {
  return (
    <div className="fixed right-4 bottom-4 z-40">
      <Menu>
        <LibraryTooltip side="left" label="Skills and appearance">
          <MenuTrigger
            aria-label="Skills and appearance"
            className="bg-background text-foreground ring-foreground/10 hover:bg-background data-popup-open:bg-background size-10 justify-center rounded-(--library-icon) p-0 shadow-[0_1px_2px_oklch(0_0_0/8%),0_8px_24px_-8px_oklch(0_0_0/30%)] ring-1 dark:shadow-[0_1px_2px_oklch(0_0_0/40%),0_8px_24px_-8px_oklch(0_0_0/70%)]"
          >
            <SettingsIcon aria-hidden />
          </MenuTrigger>
        </LibraryTooltip>
        <MenuContent side="top" align="end">
          {skills.length > 0 ? (
            <>
              <MenuGroup>
                <MenuLabel>Skills for {title}</MenuLabel>
                {skills.map((skill) => (
                  <MenuItem key={skill.name} onClick={() => onSkill(skill)}>
                    <span
                      aria-hidden
                      className="grid [&>svg]:h-[18px] [&>svg]:w-6"
                    >
                      <SkillGlyph name={skill.name} />
                    </span>
                    {skill.title}
                  </MenuItem>
                ))}
              </MenuGroup>
              <MenuSeparator />
            </>
          ) : null}
          <MenuItem onClick={onAppearance}>
            <PaletteIcon aria-hidden />
            Appearance
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
