"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, BrainIcon } from "lucide-react";
import { typeDeck, typePage } from "@/components/shared/type";
import {
  LIBRARY_COMMANDS,
  LIBRARY_GUIDE,
  LIBRARY_HOME_SKILLS,
  LIBRARY_SECTIONS,
  libraryTotal,
  sectionCount,
  type LibraryEntry,
  type LibrarySection,
} from "@/lib/library/library-data";
import { LIBRARY_SKILLS, type LibrarySkill } from "@/lib/library/skills-data";
import { cn } from "@/lib/utils";
import { AgentsCarousel } from "./agents-carousel";
import { GlyphLibrary, LibraryGlyph } from "./library-glyphs";
import { iconMenuTrigger } from "./library-item";
import { LibraryMark } from "./library-mark";
import { LibraryStepCommand } from "./library-step-command";
import { LibraryTooltip } from "./library-tooltip";
import { VisualBackdrop, visualLift, type VisualTone } from "./library-visual";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "./menu";
import { SkillGlyph } from "./skill-glyphs";
import { StarterGlyph } from "./starter-glyphs";

const mono = "font-mono [font-variant-ligatures:none]";

const focus = "focus-visible:ring-ring outline-none focus-visible:ring-2";

/** A line drawing sized to sit where a logo would. */
const drawing = "grid [&>svg]:h-[18px] [&>svg]:w-6";

type Shot = { light: string; dark: string };

/** One thing a hero visual shows: an item of the open tab, or a tab itself on All. */
type HeroItem = {
  key: string;
  name: string;
  /** What installs it, or where it sits. */
  note: string;
  mark: ReactNode;
  image?: Shot;
};

const COMMAND_PREFIXES = [
  "npx shadcn@latest add ",
  "npx assistant-ui@latest ",
  "npm install ",
];

/** The part of an install command that names the item. */
const target = (command: string) => {
  const prefix = COMMAND_PREFIXES.find((start) => command.startsWith(start));
  return prefix ? command.slice(prefix.length) : command;
};

const fromEntry = (entry: LibraryEntry, group: string): HeroItem => {
  switch (entry.kind) {
    case "link": {
      const { name, mark, command, description, href } = entry.link;
      return {
        key: `${href}:${name}`,
        name,
        note: mark?.startsWith("agent:")
          ? description
          : command
            ? target(command)
            : group,
        mark: mark ? <LibraryMark mark={mark} name={name} /> : null,
      };
    }
    case "skill":
      return {
        key: entry.skill.name,
        name: entry.skill.title,
        note: entry.skill.slash,
        mark: (
          <span aria-hidden className={drawing}>
            <SkillGlyph name={entry.skill.name} />
          </span>
        ),
      };
    case "starter": {
      const light = entry.starter.screenshots?.light[0];
      const dark = entry.starter.screenshots?.dark[0];
      return {
        key: entry.starter.name,
        name: entry.starter.label,
        note: entry.starter.framework,
        mark: (
          <span aria-hidden className={drawing}>
            <StarterGlyph starter={entry.starter} />
          </span>
        ),
        ...(light && dark && { image: { light, dark } }),
      };
    }
    case "block":
      return {
        key: entry.block.slug,
        name: entry.block.title,
        note: entry.block.stack[0] ?? "Block",
        mark: null,
        image: entry.block.image,
      };
  }
};

const itemsOf = (section: LibrarySection | undefined): HeroItem[] =>
  section
    ? section.groups.flatMap((group) =>
        group.entries.map((entry) => fromEntry(entry, group.label)),
      )
    : LIBRARY_SECTIONS.map((item) => ({
        key: item.id,
        name: item.title,
        note: `${sectionCount(item)}`,
        mark: (
          <span aria-hidden className={drawing}>
            <LibraryGlyph id={item.id} />
          </span>
        ),
      }));

function Screenshot({ image, sizes }: { image: Shot; sizes: string }) {
  return (
    <>
      <Image
        src={image.light}
        alt=""
        fill
        sizes={sizes}
        className="object-cover object-top dark:hidden"
      />
      <Image
        src={image.dark}
        alt=""
        fill
        sizes={sizes}
        className="hidden object-cover object-top dark:block"
      />
    </>
  );
}

type LookProps = {
  title: string;
  count: number;
  items: readonly HeroItem[];
  tone: VisualTone;
};

const caption =
  "bg-background/85 text-muted-foreground mx-auto flex h-7 max-w-[92%] items-center rounded-full px-3 text-xs backdrop-blur-md";

/** Logo tiles, or screenshots when the tab has them; pointing at one names it below. */
function Tiles({ title, count, items, tone }: LookProps) {
  const [key, setKey] = useState<string | null>(null);
  const shots = items.filter((item) => item.image).slice(0, 3);
  const marks = items.filter((item) => item.mark).slice(0, 14);
  const shown = shots.length > 0 ? shots : marks;
  const picked = shown.find((item) => item.key === key);
  const rows =
    marks.length > 7 ? [marks.slice(0, 7), marks.slice(7, 14)] : [marks];

  return (
    <VisualBackdrop
      tone={tone}
      className="flex h-52 flex-col justify-center gap-2.5 rounded-3xl px-5"
    >
      {shots.length > 0 ? (
        <ul aria-hidden className="flex justify-center gap-2.5">
          {shots.map((item) => (
            <li
              key={item.key}
              onPointerEnter={() => setKey(item.key)}
              className={cn(
                "bg-background relative aspect-[16/10] min-w-0 flex-1 overflow-hidden rounded-lg transition-[translate] hover:-translate-y-0.5 motion-reduce:transition-none",
                visualLift,
              )}
            >
              {item.image ? (
                <Screenshot image={item.image} sizes="140px" />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        rows.map((row, index) => (
          <ul
            key={index}
            aria-hidden
            className={cn(
              "flex justify-center gap-2.5",
              index === 1 && "translate-x-6",
            )}
          >
            {row.map((item) => (
              <li
                key={item.key}
                onPointerEnter={() => setKey(item.key)}
                className={cn(
                  "bg-background/90 grid size-10 shrink-0 place-items-center rounded-xl backdrop-blur-md transition-[translate] hover:-translate-y-0.5 motion-reduce:transition-none",
                  visualLift,
                )}
              >
                {item.mark}
              </li>
            ))}
          </ul>
        ))
      )}
      <p aria-hidden className={cn(caption, "mt-1", visualLift)}>
        <span className="truncate">
          {picked ? (
            <>
              <span className="text-foreground font-medium">{picked.name}</span>{" "}
              <span className={mono}>{picked.note}</span>
            </>
          ) : (
            `${count} in ${title}`
          )}
        </span>
      </p>
    </VisualBackdrop>
  );
}

/** A stack of cards, one item each; a click brings the next one to the front. */
function Stack({ title, items, tone }: LookProps) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const shown = [0, 1, 2]
    .filter((depth) => depth < count)
    .map((depth) => ({ item: items[(index + depth) % count]!, depth }));

  return (
    <VisualBackdrop
      tone={tone}
      className="grid h-52 place-items-center rounded-3xl px-6 pb-4"
    >
      <div className="relative h-14 w-full max-w-xs">
        {shown
          .slice()
          .reverse()
          .map(({ item, depth }) => (
            <div
              key={item.key}
              style={{
                transform: `translateY(${depth * 9}px) scale(${1 - depth * 0.05})`,
                opacity: depth === 2 ? 0.55 : 1,
                zIndex: 3 - depth,
              }}
              className={cn(
                "bg-background absolute inset-0 flex items-center gap-3 rounded-xl ps-2.5 pe-3 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                visualLift,
              )}
            >
              {item.image ? (
                <span className="bg-foreground/[0.04] relative h-9 w-14 shrink-0 overflow-hidden rounded-lg">
                  <Screenshot image={item.image} sizes="56px" />
                </span>
              ) : item.mark ? (
                <span className="bg-foreground/[0.04] grid h-9 w-11 shrink-0 place-items-center rounded-lg">
                  {item.mark}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium">
                  {item.name}
                </span>
                <span
                  className={cn(mono, "text-muted-foreground truncate text-xs")}
                >
                  {item.note}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {((index + depth) % count) + 1} of {count}
              </span>
              {depth === 0 && count > 1 ? (
                <button
                  type="button"
                  aria-label={`${item.name}, ${((index + depth) % count) + 1} of ${count} in ${title}. Show the next one.`}
                  onClick={() => setIndex((current) => (current + 1) % count)}
                  className={cn(
                    "absolute inset-0 cursor-pointer rounded-xl",
                    focus,
                  )}
                />
              ) : null}
            </div>
          ))}
      </div>
    </VisualBackdrop>
  );
}

/** A sheet of paper on a backdrop, listing the first items and what installs each. */
function Sheet({ title, count, items, tone }: LookProps) {
  return (
    <VisualBackdrop tone={tone} className="h-52 rounded-3xl px-6 pt-5">
      <div
        aria-hidden
        className={cn(
          "bg-background flex h-full flex-col gap-1.5 rounded-t-xl p-3",
          visualLift,
        )}
      >
        <div className="flex items-baseline justify-between gap-3 px-1.5">
          <span className="text-xs font-medium">{title}</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {count}
          </span>
        </div>
        <ul className="min-h-0 flex-1 overflow-hidden">
          {items.slice(0, 6).map((item) => (
            <li key={item.key} className="flex h-8 items-center gap-2.5 px-1.5">
              {item.mark ? (
                <span className="grid w-6 shrink-0 place-items-center">
                  {item.mark}
                </span>
              ) : null}
              <span className="shrink-0 truncate text-[13px]">{item.name}</span>
              <span
                className={cn(
                  mono,
                  "text-muted-foreground ms-auto min-w-0 truncate text-xs",
                )}
              >
                {item.note}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </VisualBackdrop>
  );
}

const PILL_COUNT = 7;

/** The first items as floating pills, and one pill that counts the rest. */
function Pills({ items, tone }: LookProps) {
  const rest = items.length - PILL_COUNT;
  return (
    <VisualBackdrop
      tone={tone}
      className="grid h-52 place-items-center rounded-3xl px-6"
    >
      <ul aria-hidden className="flex flex-wrap justify-center gap-2">
        {items.slice(0, PILL_COUNT).map((item) => (
          <li
            key={item.key}
            className={cn(
              "bg-background flex h-8 max-w-full items-center gap-2 rounded-full px-3 text-[13px] font-medium",
              visualLift,
            )}
          >
            {item.mark}
            <span className="truncate">{item.name}</span>
          </li>
        ))}
        {rest > 0 ? (
          <li
            className={cn(
              "bg-background/85 text-muted-foreground flex h-8 items-center rounded-full px-3 text-[13px] tabular-nums backdrop-blur-md",
              visualLift,
            )}
          >
            and {rest} more
          </li>
        ) : null}
      </ul>
    </VisualBackdrop>
  );
}

const LOOKS = [
  { name: "tiles", Look: Tiles, tone: "mint" },
  { name: "a card stack", Look: Stack, tone: "dawn" },
  { name: "a list", Look: Sheet, tone: "iris" },
  { name: "pills", Look: Pills, tone: "mint" },
] as const;

/** The open tab's items as a carousel: one look at a time, with a dot for each. */
function HeroCarousel({ section }: { section: LibrarySection | undefined }) {
  const [index, setIndex] = useState(0);
  const items = itemsOf(section);
  const title = section ? section.title : "the library";
  const count = section
    ? sectionCount(section)
    : libraryTotal(LIBRARY_SECTIONS);
  // Tiles need something to draw, so a tab of plain names starts at the stack.
  const looks = items.some((item) => item.mark || item.image)
    ? LOOKS
    : LOOKS.slice(1);
  const at = index % looks.length;
  const { Look, tone } = looks[at]!;

  return (
    <div className="hidden flex-col gap-2.5 lg:flex">
      <div
        key={`${section?.id ?? "all"}-${at}`}
        className="animate-in fade-in-0 duration-300 motion-reduce:animate-none"
      >
        <Look
          title={section ? section.title : "Library"}
          count={count}
          items={items}
          tone={tone}
        />
      </div>
      <div
        role="group"
        aria-label={`Ways to see ${title}`}
        className="flex justify-center gap-1"
      >
        {looks.map((look, position) => (
          <button
            key={look.name}
            type="button"
            aria-pressed={position === at}
            aria-label={`Show ${title} as ${look.name}`}
            onClick={() => setIndex(position)}
            className={cn(
              "group/dot grid h-5 cursor-pointer place-items-center rounded-full px-1",
              focus,
            )}
          >
            <span
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none",
                position === at
                  ? "bg-foreground/60 w-4"
                  : "bg-foreground/15 group-hover/dot:bg-foreground/30 w-1.5",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/** The top of the library under its tabs: the open tab's name, what it holds, how to install it, and a carousel of previews. */
export function LibraryHero({
  section,
  onSkill,
}: {
  section: LibrarySection | undefined;
  /** Opens a skill's details. */
  onSkill: (skill: LibrarySkill) => void;
}) {
  // A tab with no skill of its own offers the overview, which says which skill to use.
  const names = section?.skills ?? LIBRARY_HOME_SKILLS;
  const skills = names.flatMap((name) => {
    const skill = LIBRARY_SKILLS.find((entry) => entry.name === name);
    return skill ? [skill] : [];
  });
  const commands = section ? section.commands : LIBRARY_COMMANDS;
  const guide = section
    ? { label: section.guide, href: section.href }
    : LIBRARY_GUIDE;

  return (
    <div className="mb-10 grid grid-cols-[minmax(0,1fr)] items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-foreground/[0.03] dark:bg-foreground/[0.045] grid h-10 w-12 shrink-0 place-items-center rounded-xl"
          >
            {section ? <LibraryGlyph id={section.id} /> : <GlyphLibrary />}
          </span>
          <h1 className={typePage}>{section ? section.title : "Library"}</h1>
        </div>
        <p className={typeDeck}>
          {section
            ? section.description
            : `${libraryTotal(LIBRARY_SECTIONS)} things you can add to an assistant-ui project.`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {commands ? (
            <LibraryStepCommand
              key={section?.id ?? "all"}
              base={commands.base}
              steps={commands.steps}
            />
          ) : null}
          <Link
            href={guide.href}
            className={cn(
              "group/cta bg-foreground/[0.06] hover:bg-foreground/[0.1] inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
              focus,
            )}
          >
            {guide.label}
            <ArrowRightIcon
              aria-hidden
              className="size-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
          {skills.length > 0 ? (
            <Menu>
              <LibraryTooltip label="Skills for this tab">
                <MenuTrigger
                  aria-label={`Skills for ${section ? section.title : "the library"}`}
                  className={cn(
                    iconMenuTrigger,
                    "bg-foreground/[0.06] text-foreground size-9",
                  )}
                >
                  <BrainIcon aria-hidden />
                </MenuTrigger>
              </LibraryTooltip>
              <MenuContent align="start">
                <MenuGroup>
                  <MenuLabel>Skills</MenuLabel>
                  {skills.map((skill) => (
                    <MenuItem key={skill.name} onClick={() => onSkill(skill)}>
                      <span aria-hidden className={drawing}>
                        <SkillGlyph name={skill.name} />
                      </span>
                      {skill.title}
                    </MenuItem>
                  ))}
                </MenuGroup>
              </MenuContent>
            </Menu>
          ) : null}
        </div>
      </div>
      {section?.id === "agents" ? (
        <div className="hidden lg:block">
          <AgentsCarousel />
        </div>
      ) : (
        <HeroCarousel section={section} />
      )}
    </div>
  );
}
