"use client";

import { useState } from "react";
import { GenerativeMarkdown } from "@/components/assistant-ui/elements/generative-markdown";
import { ItemGlyph } from "@/components/library/item-glyph";
import {
  PanelCopy,
  Picker,
  pickerHeader,
} from "@/components/pages/skills/picker-parts";
import {
  body,
  markdown,
  type SkillRow,
} from "@/components/pages/skills/skill-list";
import { DemoFrame } from "@/components/shared/demo-frame";

/** Pick a skill and read the SKILL.md your agent gets; copy installs that skill alone. */
export function SkillPicker({ skills }: { skills: readonly SkillRow[] }) {
  const [id, setId] = useState(
    skills.find((skill) => skill.item.name === "setup")?.item.id ??
      skills[0]!.item.id,
  );
  const skill = skills.find((entry) => entry.item.id === id) ?? skills[0]!;

  return (
    <DemoFrame
      caption={`Your agent reads this before it writes code. Call it as /${skill.item.name}.`}
      frameClassName="h-[24rem]"
    >
      <div className={pickerHeader}>
        <Picker
          label="Skill"
          options={skills.map((entry) => ({
            id: entry.item.id,
            label: `/${entry.item.name}`,
            icon: <ItemGlyph item={entry.item} />,
          }))}
          value={skill.item.id}
          onValue={setId}
        />
        <span className="text-muted-foreground ms-auto truncate font-mono text-xs [font-variant-ligatures:none]">
          {skill.item.name}/SKILL.md
        </span>
        <PanelCopy
          text={skill.command}
          label={`Copy the install command for ${skill.item.name}`}
        />
      </div>
      <div
        key={skill.item.id}
        className={`min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm! ${markdown}`}
      >
        <GenerativeMarkdown value={body(skill.content)} />
      </div>
    </DemoFrame>
  );
}
