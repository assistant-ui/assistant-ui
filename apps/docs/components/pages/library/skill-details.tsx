"use client";

import {
  FileTextIcon,
  HashIcon,
  SquareSlashIcon,
  TerminalIcon,
} from "lucide-react";
import { SKILLS_COMMAND, type LibrarySkill } from "@/lib/library/skills-data";
import { LibraryCopyButton } from "./library-copy-button";
import { GroupRow, RowGroup } from "./library-row-group";
import { SkillText } from "./skill-text";

const mono = "truncate font-mono text-xs [font-variant-ligatures:none]";

/** The ways to get one skill: on its own, with the rest, and by its slash command. */
export function SkillInstall({
  skill,
  total,
}: {
  skill: LibrarySkill;
  total: number;
}) {
  return (
    <RowGroup title="Install">
      <GroupRow
        icon={<TerminalIcon aria-hidden />}
        label="This skill"
        value={<span className={mono}>{skill.command}</span>}
        action={
          <LibraryCopyButton
            text={skill.command}
            label={`Copy the install command for ${skill.name}`}
            className="-me-1.5"
          />
        }
      />
      <GroupRow
        icon={<TerminalIcon aria-hidden />}
        label={`All ${total} skills`}
        value={<span className={mono}>{SKILLS_COMMAND}</span>}
        action={
          <LibraryCopyButton
            text={SKILLS_COMMAND}
            label="Copy the install command for every skill"
            className="-me-1.5"
          />
        }
      />
      <GroupRow
        icon={<SquareSlashIcon aria-hidden />}
        label="Slash command"
        value={<span className={mono}>{skill.slash}</span>}
        action={
          <LibraryCopyButton
            text={skill.slash}
            label={`Copy ${skill.slash}`}
            className="-me-1.5"
          />
        }
      />
    </RowGroup>
  );
}

/** The description an agent matches a task against. */
export function SkillTrigger({ skill }: { skill: LibrarySkill }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-sm">When an agent loads it</h3>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-pretty">
        {skill.description.split(/(?<=\.)\s+(?=[A-Z])/).map((sentence) => (
          <p key={sentence}>
            <SkillText text={sentence} />
          </p>
        ))}
      </div>
    </section>
  );
}

export function SkillSections({ skill }: { skill: LibrarySkill }) {
  if (skill.sections.length === 0) return null;
  return (
    <RowGroup
      title="Sections"
      aside={<span className="tabular-nums">{skill.sections.length}</span>}
    >
      {skill.sections.map((section) => (
        <GroupRow
          key={section}
          icon={<HashIcon aria-hidden />}
          label={<SkillText text={section} />}
        />
      ))}
    </RowGroup>
  );
}

export function SkillReferences({ skill }: { skill: LibrarySkill }) {
  if (skill.references.length === 0) return null;
  return (
    <RowGroup
      title="Reference files"
      aside={<span className="tabular-nums">{skill.references.length}</span>}
    >
      {skill.references.map((reference) => (
        <GroupRow
          key={reference.file}
          icon={<FileTextIcon aria-hidden />}
          label={reference.file}
          mono
          {...(reference.note && {
            value: (
              <span className="truncate" title={reference.note}>
                {reference.note}
              </span>
            ),
          })}
        />
      ))}
    </RowGroup>
  );
}

export function SkillRelated({
  skill,
  onSelect,
}: {
  skill: LibrarySkill;
  onSelect: (name: string) => void;
}) {
  if (skill.related.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-sm">Related skills</h3>
      <ul className="flex flex-wrap gap-1.5">
        {skill.related.map((name) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => onSelect(name)}
              className="bg-foreground/[0.04] hover:bg-foreground/[0.08] focus-visible:ring-ring h-8 cursor-pointer rounded-full px-3 font-mono text-xs transition-colors outline-none [font-variant-ligatures:none] focus-visible:ring-2"
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
