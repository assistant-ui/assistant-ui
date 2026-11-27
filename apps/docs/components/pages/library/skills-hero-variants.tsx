"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon, XIcon } from "lucide-react";
import { typeDeck, typePage } from "@/components/shared/type";
import { SKILLS_COMMAND, type LibrarySkill } from "@/lib/library/skills-data";
import { cn } from "@/lib/utils";
import { LibraryCopyButton } from "./library-copy-button";
import { VisualBackdrop, visualLift, type VisualTone } from "./library-visual";
import { SkillDialog } from "./skill-dialog";
import { SkillGlyph } from "./skill-glyphs";
import { SkillMarkdown } from "./skill-markdown";
import { SkillsHeroActions } from "./skills-hero-actions";

type HeroProps = { skills: readonly LibrarySkill[] };

const pick = (skills: readonly LibrarySkill[], names: readonly string[]) =>
  names.flatMap((name) => skills.find((skill) => skill.name === name) ?? []);

const FEATURED = ["setup", "elements", "tools"];
const TILES = [
  "assistant-ui",
  "setup",
  "elements",
  "primitives",
  "generative-ui",
  "runtime",
  "tools",
  "streaming",
  "cloud",
  "copilots",
  "markdown",
  "observability",
];

const mono = "font-mono [font-variant-ligatures:none]";

const focus = "focus-visible:ring-ring outline-none focus-visible:ring-2";

/** A glyph drawn small, for a chip or a list row. */
const smallGlyph = "[&>svg]:h-4 [&>svg]:w-[1.35rem]";

/** The skill dialog for a hero whose visual opens skills. */
function useSkillDialog(skills: readonly LibrarySkill[]) {
  const [selected, setSelected] = useState<LibrarySkill | null>(null);
  const [open, setOpen] = useState(false);
  return {
    show: (name: string) => {
      const skill = skills.find((candidate) => candidate.name === name);
      if (!skill) return;
      setSelected(skill);
      setOpen(true);
    },
    dialog: <SkillDialog skill={selected} open={open} onOpenChange={setOpen} />,
  };
}

function HeroText({
  count,
  className,
  children,
}: {
  count: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link
          href="/library"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Library
        </Link>
      </nav>
      <h1 className={typePage}>Skills</h1>
      <p className={typeDeck}>
        {count} skills a coding agent loads to build with assistant-ui, all
        installed with one command.
      </p>
      {children}
    </div>
  );
}

function GuideLink() {
  return (
    <Link
      href="/docs/llm#skills"
      className={cn(
        "group/cta bg-foreground/[0.06] hover:bg-foreground/[0.1] inline-flex h-9 w-fit items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
        focus,
      )}
    >
      Read the skills guide
      <ArrowRightIcon
        aria-hidden
        className="size-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}

/** A command on a floating pill, with its copy button. */
function CommandPill({
  command = SKILLS_COMMAND,
  className,
}: {
  command?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-background/85 flex h-8 items-center gap-1 rounded-full ps-3 pe-0.5 backdrop-blur-md",
        visualLift,
        className,
      )}
    >
      <code
        className={cn(
          mono,
          "min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto text-xs whitespace-nowrap [&::-webkit-scrollbar]:hidden",
        )}
      >
        <span aria-hidden className="text-muted-foreground me-1.5">
          $
        </span>
        {command}
      </code>
      <LibraryCopyButton
        text={command}
        label="Copy install command"
        className="size-7 rounded-full [&_svg]:size-3.5"
      />
    </div>
  );
}

/** A skill as a floating pill: its glyph and slash command in a chip, then what it does. Opens the skill. */
function SkillPill({
  skill,
  onOpen,
  className,
}: {
  skill: LibrarySkill;
  onOpen: (name: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-nav-glyph-motion
      aria-haspopup="dialog"
      onClick={() => onOpen(skill.name)}
      className={cn(
        "group/navlink bg-background/85 hover:bg-background flex h-8 max-w-full cursor-pointer items-center gap-2 rounded-full ps-1 pe-3.5 text-left backdrop-blur-md transition-[background-color,translate] hover:-translate-y-0.5 motion-reduce:transition-none",
        visualLift,
        focus,
        className,
      )}
    >
      <span
        className={cn(
          "bg-foreground/[0.05] flex h-6 shrink-0 items-center gap-1 rounded-full ps-1.5 pe-2",
          "[&>svg]:h-3.5 [&>svg]:w-[1.17rem]",
        )}
      >
        <SkillGlyph name={skill.name} />
        <span className={cn(mono, "text-xs")}>{skill.slash}</span>
      </span>
      <span className="truncate text-[13px]">{skill.summary}</span>
    </button>
  );
}

const tile =
  "group/navlink bg-background/90 grid size-10 shrink-0 place-items-center rounded-xl backdrop-blur-md [&>svg]:h-[1.125rem] [&>svg]:w-6";

/** Text on the left, a visual of a fixed modest width on the right. */
const split =
  "mb-10 grid grid-cols-[minmax(0,1fr)] items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]";

/** The same, with the visual stretched to the height of the title and description. */
const compact =
  "mb-10 grid grid-cols-[minmax(0,1fr)] items-stretch gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]";

const panel = "h-52 w-full rounded-3xl";

const strip = "h-full min-h-28 w-full rounded-3xl";

/** The plain hero, text and actions with no visual; a variant falls back to it when its skill is missing. */
function SkillsHeroCurrent({ skills }: HeroProps) {
  return (
    <HeroText count={skills.length} className="mb-8">
      <SkillsHeroActions />
    </HeroText>
  );
}

/** Three skills as pills on a backdrop; a pill opens its skill. */
export function SkillsHeroPills({
  skills,
  tone,
}: HeroProps & { tone: VisualTone }) {
  const { show, dialog } = useSkillDialog(skills);
  const featured = pick(skills, FEATURED);
  return (
    <div className={split}>
      {dialog}
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <VisualBackdrop
        tone={tone}
        className={cn(
          panel,
          "flex flex-col items-center justify-center gap-2 px-5",
        )}
      >
        {featured.map((skill, index) => (
          <SkillPill
            key={skill.name}
            skill={skill}
            onOpen={show}
            className={["w-[94%]", "w-[86%]", "w-[78%]"][index] ?? "w-3/4"}
          />
        ))}
      </VisualBackdrop>
    </div>
  );
}

/** Glyph tiles; pointing at one names it below, and a click opens it. */
export function SkillsHeroTiles({ skills }: HeroProps) {
  const { show, dialog } = useSkillDialog(skills);
  const tiles = pick(skills, TILES);
  const [name, setName] = useState<string | null>(null);
  const active = tiles.find((skill) => skill.name === name);
  const rows = [tiles.slice(0, 6), tiles.slice(6, 12)];
  return (
    <div className={split}>
      {dialog}
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <VisualBackdrop
        tone="mint"
        className={cn(panel, "flex flex-col justify-center gap-2.5")}
      >
        {rows.map((row, index) => (
          <div
            key={index}
            className={cn(
              "flex justify-center gap-2.5",
              index === 1 && "translate-x-6",
            )}
          >
            {row.map((skill) => (
              <button
                key={skill.name}
                type="button"
                data-nav-glyph-motion
                aria-haspopup="dialog"
                aria-label={`${skill.title}: ${skill.summary}`}
                onPointerEnter={() => setName(skill.name)}
                onFocus={() => setName(skill.name)}
                onClick={() => show(skill.name)}
                className={cn(
                  tile,
                  visualLift,
                  focus,
                  "cursor-pointer transition-[translate] hover:-translate-y-0.5 motion-reduce:transition-none",
                )}
              >
                <SkillGlyph name={skill.name} />
              </button>
            ))}
          </div>
        ))}
        <p
          aria-hidden
          className={cn(
            "bg-background/85 mx-auto mt-1 flex h-7 max-w-[88%] items-center gap-2 rounded-full px-3 text-xs backdrop-blur-md",
            visualLift,
          )}
        >
          {active ? (
            <>
              <span className={cn(mono, "shrink-0")}>{active.slash}</span>
              <span className="text-muted-foreground truncate">
                {active.summary}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Point at a skill to see what it does.
            </span>
          )}
        </p>
      </VisualBackdrop>
    </div>
  );
}

/**
 * Skills as a stack of cards, the way toasts stack: clicking the front one
 * sends it away and brings up the next. `copy` puts a copy button for the
 * front skill's install command on its card.
 */
function SkillStack({
  skills,
  copy = false,
  className,
}: HeroProps & { copy?: boolean; className?: string }) {
  const [index, setIndex] = useState(0);
  const count = skills.length;
  const shown = [0, 1, 2].flatMap((depth) => {
    const skill = skills[(index + depth) % count];
    return skill ? [{ skill, depth }] : [];
  });
  return (
    <div className={cn("relative h-14 w-full max-w-xs", className)}>
      {shown
        .slice()
        .reverse()
        .map(({ skill, depth }) => (
          <div
            key={skill.name}
            data-nav-glyph-motion
            style={{
              transform: `translateY(${depth * 9}px) scale(${1 - depth * 0.05})`,
              opacity: depth === 2 ? 0.55 : 1,
              zIndex: 3 - depth,
            }}
            className={cn(
              "group/navlink bg-background absolute inset-0 flex items-center gap-3 rounded-xl ps-2.5 pe-2 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              visualLift,
            )}
          >
            <span
              className={cn(
                "bg-foreground/[0.04] grid h-9 w-11 shrink-0 place-items-center rounded-lg",
                "[&>svg]:h-[1.125rem] [&>svg]:w-6",
              )}
            >
              <SkillGlyph name={skill.name} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-baseline gap-1.5">
                <span className="truncate text-[13px] font-medium">
                  {skill.title}
                </span>
                <span className={cn(mono, "text-muted-foreground text-xs")}>
                  {skill.slash}
                </span>
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {skill.summary}
              </span>
            </span>
            {depth === 0 ? (
              <>
                <button
                  type="button"
                  aria-label={`${skill.title}: ${skill.summary} Show the next skill.`}
                  onClick={() => setIndex((current) => (current + 1) % count)}
                  className={cn(
                    "absolute inset-0 cursor-pointer rounded-xl",
                    focus,
                  )}
                />
                {copy ? (
                  <LibraryCopyButton
                    text={skill.command}
                    label={`Copy the install command for ${skill.name}`}
                    className="relative size-7 rounded-full [&_svg]:size-3.5"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        ))}
    </div>
  );
}

/** The toast-style stack on a backdrop; clicking the front card goes to the next skill. */
export function SkillsHeroStack({ skills }: HeroProps) {
  return (
    <div className={split}>
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <VisualBackdrop
        tone="dawn"
        className={cn(panel, "grid place-items-center px-6 pb-4")}
      >
        <SkillStack skills={skills} />
      </VisualBackdrop>
    </div>
  );
}

const fileTab =
  "h-6 shrink-0 cursor-pointer rounded-full px-2 text-xs whitespace-nowrap transition-colors";

/** A sheet of one skill: its name, its file tabs, and the file you pick, read in place. */
function SkillSheetPreview({
  skill,
  className,
}: {
  skill: LibrarySkill;
  className?: string;
}) {
  const files = [
    { name: "SKILL.md", href: skill.rawHref, base: undefined },
    ...skill.references.map(({ file, href }) => ({
      name: file,
      href,
      base: href,
    })),
  ];
  const [name, setName] = useState("SKILL.md");
  const file = files.find((entry) => entry.name === name) ?? files[0]!;
  return (
    <div
      className={cn(
        "bg-background flex min-h-0 flex-col gap-2 p-3.5",
        visualLift,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "bg-foreground/[0.04] grid h-7 w-9 shrink-0 place-items-center rounded-md",
            smallGlyph,
          )}
        >
          <SkillGlyph name={skill.name} />
        </span>
        <span className="text-[13px] font-medium">{skill.title}</span>
        <span className={cn(mono, "text-muted-foreground text-xs")}>
          {skill.slash}
        </span>
      </div>
      <div
        role="group"
        aria-label={`${skill.title} files`}
        className="-mx-1 flex shrink-0 [scrollbar-width:none] gap-0.5 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] px-1 pe-6 [&::-webkit-scrollbar]:hidden"
      >
        {files.map((entry) => (
          <button
            key={entry.name}
            type="button"
            aria-pressed={entry.name === file.name}
            onClick={() => setName(entry.name)}
            className={cn(
              mono,
              fileTab,
              focus,
              "focus-visible:ring-inset",
              entry.name === file.name
                ? "bg-foreground/[0.06]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.name}
          </button>
        ))}
      </div>
      <div
        tabIndex={0}
        className={cn(
          "min-h-0 flex-1 [zoom:0.85] overflow-y-auto rounded-md pe-2",
          focus,
        )}
      >
        <SkillMarkdown
          key={file.href}
          href={file.href}
          label={file.name}
          {...(file.base && { base: file.base })}
        />
      </div>
    </div>
  );
}

/** A skill's own files as a sheet of paper; the tabs switch the file and it scrolls. */
export function SkillsHeroDocument({ skills }: HeroProps) {
  const [skill] = pick(skills, ["setup"]);
  if (!skill) return <SkillsHeroCurrent skills={skills} />;
  return (
    <div className={split}>
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <VisualBackdrop tone="iris" className="h-60 rounded-3xl px-6 pt-5">
        <SkillSheetPreview skill={skill} className="h-full rounded-t-xl" />
      </VisualBackdrop>
    </div>
  );
}

/** Small glyph tiles that pick one skill; picking the chosen one again clears it. */
function SkillPicker({
  skills,
  name,
  onNameChange,
}: {
  skills: readonly LibrarySkill[];
  name: string | null;
  onNameChange: (name: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Install one skill"
      className="flex justify-center gap-1.5"
    >
      {skills.map((skill) => (
        <button
          key={skill.name}
          type="button"
          data-nav-glyph-motion
          aria-pressed={skill.name === name}
          aria-label={skill.title}
          title={skill.title}
          onClick={() => onNameChange(skill.name === name ? null : skill.name)}
          className={cn(
            tile,
            visualLift,
            focus,
            "size-9 cursor-pointer rounded-lg transition-[translate] hover:-translate-y-0.5 motion-reduce:transition-none",
            skill.name === name && "ring-foreground/60 ring-2",
          )}
        >
          <SkillGlyph name={skill.name} />
        </button>
      ))}
    </div>
  );
}

/** The install command is the visual; picking a skill shows the command for just that one. */
export function SkillsHeroCommand({ skills }: HeroProps) {
  const tiles = pick(skills, TILES).slice(0, 8);
  const [name, setName] = useState<string | null>(null);
  const chosen = tiles.find((skill) => skill.name === name);
  return (
    <div className={split}>
      <HeroText count={skills.length}>
        <GuideLink />
      </HeroText>
      <VisualBackdrop
        tone="sand"
        className={cn(
          panel,
          "flex flex-col items-center justify-center gap-3 px-5",
        )}
      >
        <SkillPicker skills={tiles} name={name} onNameChange={setName} />
        <p aria-live="polite" className="text-muted-foreground text-xs">
          {chosen ? (
            <>
              Only{" "}
              <span className="text-foreground font-medium">
                {chosen.title}
              </span>
              . Click it again for all of them.
            </>
          ) : (
            `All ${skills.length} skills. Pick one to install it on its own.`
          )}
        </p>
        <CommandPill
          command={chosen?.command ?? SKILLS_COMMAND}
          className="w-full max-w-sm"
        />
      </VisualBackdrop>
    </div>
  );
}

/** The way a skill is called: type after the slash and the list narrows; a row opens its skill. */
export function SkillsHeroSlash({ skills }: HeroProps) {
  const { show, dialog } = useSkillDialog(skills);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const needle = query.trim().toLowerCase().replace(/^\//, "");
  const matches = skills
    .filter(
      (skill) =>
        skill.name.includes(needle) ||
        skill.title.toLowerCase().includes(needle),
    )
    .slice(0, 4);
  const at = Math.min(active, Math.max(0, matches.length - 1));
  return (
    <div className={split}>
      {dialog}
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <VisualBackdrop
        tone="dawn"
        className="flex h-60 flex-col items-center justify-end gap-1.5 rounded-3xl px-6 pb-5"
      >
        <ul
          id="skills-hero-slash-list"
          role="listbox"
          aria-label="Skills"
          className={cn(
            "bg-background/90 flex w-full max-w-xs flex-col rounded-xl p-1 backdrop-blur-md",
            visualLift,
          )}
        >
          {matches.map((skill, index) => (
            <li
              key={skill.name}
              id={`skills-hero-slash-${skill.name}`}
              role="option"
              aria-selected={index === at}
              data-nav-glyph-motion
              onPointerEnter={() => setActive(index)}
              onClick={() => show(skill.name)}
              className={cn(
                "group/navlink flex h-8 cursor-pointer items-center gap-2 rounded-lg px-1.5 text-xs",
                index === at && "bg-foreground/[0.06]",
              )}
            >
              <span
                className={cn(
                  "grid w-6 shrink-0 place-items-center",
                  smallGlyph,
                )}
              >
                <SkillGlyph name={skill.name} />
              </span>
              <span className={cn(mono, "shrink-0")}>{skill.slash}</span>
              <span className="text-muted-foreground truncate">
                {skill.summary}
              </span>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="text-muted-foreground flex h-8 items-center px-2 text-xs">
              No skill is called that.
            </li>
          ) : null}
        </ul>
        <label
          className={cn(
            "bg-background flex h-9 w-full max-w-xs items-center gap-0.5 rounded-xl px-3",
            visualLift,
            "focus-within:ring-ring focus-within:ring-2",
          )}
        >
          <span aria-hidden className={cn(mono, "text-[13px]")}>
            /
          </span>
          <input
            role="combobox"
            aria-label="Type a skill's name"
            aria-expanded
            aria-controls="skills-hero-slash-list"
            aria-activedescendant={
              matches[at] ? `skills-hero-slash-${matches[at].name}` : undefined
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive(Math.min(at + 1, matches.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive(Math.max(at - 1, 0));
              } else if (event.key === "Enter" && matches[at]) {
                show(matches[at].name);
              }
            }}
            placeholder="type a skill, like setup"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              mono,
              "placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none",
            )}
          />
        </label>
      </VisualBackdrop>
    </div>
  );
}

const TASKS = [
  { task: "Start a new chat app", skill: "setup" },
  { task: "Add a conversation sidebar", skill: "thread-list" },
  { task: "Show a tool call in the chat", skill: "tools" },
  { task: "Save chats across devices", skill: "cloud" },
  { task: "Upgrade to the latest version", skill: "update" },
];

/** The sentence of a skill's own description that says when an agent uses it. */
const whenUsed = (skill: LibrarySkill) =>
  (
    skill.description
      .split(/(?<=\.)\s+(?=[A-Z])/)
      .find((sentence) => /^(Use|Reach|Route|Start)\b/.test(sentence)) ??
    skill.summary
  ).replaceAll("`", "");

/** Pick a task and see which skill covers it, in the words of the skill's own description. */
export function SkillsHeroMatch({ skills }: HeroProps) {
  const { show, dialog } = useSkillDialog(skills);
  const tasks = TASKS.flatMap(({ task, skill: name }) => {
    const skill = skills.find((entry) => entry.name === name);
    return skill ? [{ task, skill }] : [];
  });
  const [index, setIndex] = useState(0);
  const current = tasks[index] ?? tasks[0];
  if (!current) return <SkillsHeroCurrent skills={skills} />;
  return (
    <div className={split}>
      {dialog}
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <VisualBackdrop
        tone="mint"
        className="grid h-60 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-3 rounded-3xl px-4"
      >
        <div
          role="group"
          aria-label="A task for your agent"
          className="flex flex-col items-start gap-1.5"
        >
          {tasks.map(({ task }, at) => (
            <button
              key={task}
              type="button"
              aria-pressed={at === index}
              onClick={() => setIndex(at)}
              className={cn(
                "h-7 max-w-full cursor-pointer truncate rounded-full px-2.5 text-left text-xs backdrop-blur-md transition-colors",
                visualLift,
                focus,
                at === index
                  ? "bg-foreground text-background"
                  : "bg-background/85 hover:bg-background",
              )}
            >
              {task}
            </button>
          ))}
        </div>
        <div
          key={current.skill.name}
          data-nav-glyph-motion
          aria-live="polite"
          className={cn(
            "group/navlink bg-background animate-in fade-in-0 slide-in-from-bottom-1 flex flex-col gap-2 rounded-xl p-3 duration-200 motion-reduce:animate-none",
            visualLift,
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "bg-foreground/[0.04] grid h-8 w-10 shrink-0 place-items-center rounded-lg",
                smallGlyph,
              )}
            >
              <SkillGlyph name={current.skill.name} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-medium">
                {current.skill.title}
              </span>
              <span className={cn(mono, "text-muted-foreground text-xs")}>
                {current.skill.slash}
              </span>
            </span>
          </div>
          <p className="text-muted-foreground line-clamp-4 text-xs leading-relaxed">
            {whenUsed(current.skill)}
          </p>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => show(current.skill.name)}
            className={cn(
              "bg-foreground/[0.06] hover:bg-foreground/[0.1] inline-flex h-7 w-fit cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors",
              focus,
            )}
          >
            Open the skill
            <ArrowRightIcon aria-hidden className="size-3.5" />
          </button>
        </div>
      </VisualBackdrop>
    </div>
  );
}

/**
 * A chat composer where typing a slash lists the skills. The picked skill
 * sits in the box as a chip, and the button at its end copies the install
 * command: for that skill, or for all of them while none is picked.
 */
function SkillComposer({
  skills,
  list,
  className,
}: HeroProps & {
  /** Where the slash list opens. */
  list: "above" | "below";
  className?: string;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const chosen = skills.find((skill) => skill.name === name);
  const slashed = !chosen && text.startsWith("/");
  const needle = text.slice(1).trim().toLowerCase();
  const matches = slashed
    ? skills
        .filter(
          (skill) =>
            skill.name.includes(needle) ||
            skill.title.toLowerCase().includes(needle),
        )
        .slice(0, 4)
    : [];
  const at = Math.min(active, Math.max(0, matches.length - 1));
  const choose = (skill: LibrarySkill) => {
    setName(skill.name);
    setText("");
    setActive(0);
  };
  const command = chosen?.command ?? SKILLS_COMMAND;

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      {slashed ? (
        <ul
          id="skills-hero-composer-list"
          role="listbox"
          aria-label="Skills"
          className={cn(
            "bg-background absolute inset-x-0 z-20 flex flex-col rounded-xl p-1",
            list === "above" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            visualLift,
          )}
        >
          {matches.map((skill, index) => (
            <li
              key={skill.name}
              id={`skills-hero-composer-${skill.name}`}
              role="option"
              aria-selected={index === at}
              data-nav-glyph-motion
              onPointerEnter={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(skill)}
              className={cn(
                "group/navlink flex h-8 cursor-pointer items-center gap-2 rounded-lg px-1.5 text-xs",
                index === at && "bg-foreground/[0.06]",
              )}
            >
              <span
                className={cn(
                  "grid w-6 shrink-0 place-items-center",
                  smallGlyph,
                )}
              >
                <SkillGlyph name={skill.name} />
              </span>
              <span className={cn(mono, "shrink-0")}>{skill.slash}</span>
              <span className="text-muted-foreground truncate">
                {skill.summary}
              </span>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="text-muted-foreground flex h-8 items-center px-2 text-xs">
              No skill is called that.
            </li>
          ) : null}
        </ul>
      ) : null}
      <div
        className={cn(
          "bg-background flex h-11 items-center gap-1.5 rounded-2xl ps-3 pe-2",
          visualLift,
          "focus-within:ring-ring focus-within:ring-2",
        )}
      >
        {chosen ? (
          <span
            className={cn(
              "bg-foreground/[0.06] flex h-6 shrink-0 items-center gap-1 rounded-full ps-1.5 pe-0.5",
              "[&>svg]:h-3.5 [&>svg]:w-[1.17rem]",
            )}
          >
            <SkillGlyph name={chosen.name} />
            <span className={cn(mono, "text-xs")}>{chosen.slash}</span>
            <button
              type="button"
              aria-label={`Remove ${chosen.slash}`}
              onClick={() => setName(null)}
              className={cn(
                "text-muted-foreground hover:text-foreground grid size-5 cursor-pointer place-items-center rounded-full",
                focus,
              )}
            >
              <XIcon aria-hidden className="size-3" />
            </button>
          </span>
        ) : null}
        <input
          role="combobox"
          aria-label="Type / to pick a skill"
          aria-expanded={slashed}
          aria-controls="skills-hero-composer-list"
          aria-activedescendant={
            matches[at] ? `skills-hero-composer-${matches[at].name}` : undefined
          }
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !text && chosen) {
              setName(null);
            } else if (!slashed) {
              return;
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive(Math.min(at + 1, matches.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive(Math.max(at - 1, 0));
            } else if (event.key === "Enter" && matches[at]) {
              event.preventDefault();
              choose(matches[at]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setText("");
            }
          }}
          placeholder={chosen ? "" : "Type / to pick a skill"}
          autoComplete="off"
          spellCheck={false}
          className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
        <LibraryCopyButton
          text={command}
          label={
            chosen
              ? `Copy the install command for ${chosen.name}`
              : "Copy the install command for every skill"
          }
          className="bg-foreground text-background hover:bg-foreground/90 hover:text-background size-7 rounded-full [&_svg]:size-3.5"
        />
      </div>
      <p
        aria-live="polite"
        className={cn(mono, "text-foreground/70 mt-1.5 truncate px-3 text-xs")}
      >
        {command}
      </p>
    </div>
  );
}

/** A composer on a backdrop: type a slash, pick a skill, copy its install command. */
export function SkillsHeroComposer({ skills }: HeroProps) {
  return (
    <div className={split}>
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <div className={cn(panel, "relative")}>
        <VisualBackdrop tone="iris" className="absolute inset-0 rounded-3xl" />
        <div className="relative flex h-full items-end justify-center px-6 pb-5">
          <SkillComposer skills={skills} list="above" />
        </div>
      </div>
    </div>
  );
}

/** Title and description only; the toast-style stack beside them, each card with its own copy button. */
export function SkillsHeroMiniStack({ skills }: HeroProps) {
  return (
    <div className={compact}>
      <HeroText count={skills.length} />
      <VisualBackdrop
        tone="dawn"
        className={cn(strip, "grid place-items-center px-5 pt-3 pb-7")}
      >
        <SkillStack skills={skills} copy />
      </VisualBackdrop>
    </div>
  );
}

/** Title and description only; a row of tiles picks a skill and the command under it follows. */
export function SkillsHeroMiniTiles({ skills }: HeroProps) {
  const tiles = pick(skills, TILES).slice(0, 8);
  const [name, setName] = useState<string | null>(null);
  const chosen = tiles.find((skill) => skill.name === name);
  return (
    <div className={compact}>
      <HeroText count={skills.length} />
      <VisualBackdrop
        tone="mint"
        className={cn(
          strip,
          "flex flex-col items-center justify-center gap-2.5 px-5 py-4",
        )}
      >
        <SkillPicker skills={tiles} name={name} onNameChange={setName} />
        <CommandPill
          command={chosen?.command ?? SKILLS_COMMAND}
          className="w-full max-w-sm"
        />
      </VisualBackdrop>
    </div>
  );
}

const SITE = "https://www.assistant-ui.com";

/** The docs' own rules for agents, plus the address of one skill's file. */
const SOURCES = [
  {
    label: "llms.txt",
    path: "/llms.txt",
    rule: "A structured index of every docs page.",
  },
  {
    label: "llms-full.txt",
    path: "/llms-full.txt",
    rule: "The complete documentation in one file.",
  },
  {
    label: ".mdx",
    path: "/docs/installation.mdx",
    rule: "Add .mdx to any page's address to get its markdown.",
  },
  {
    label: "SKILL.md",
    path: "/.well-known/agent-skills/setup/SKILL.md",
    rule: "Any skill, as the file an agent loads.",
  },
];

const heads = new Map<string, Promise<string>>();

/** The first lines of a text address, without downloading the rest of it. */
const loadHead = (path: string) => {
  let request = heads.get(path);
  if (!request) {
    request = (async () => {
      const response = await fetch(path);
      if (!response.ok || !response.body) throw new Error(path);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (text.length < 1200) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      void reader.cancel();
      return text.slice(0, 1200);
    })();
    request.catch(() => heads.delete(path));
    heads.set(path, request);
  }
  return request;
};

/** The addresses an agent reads, as a small address bar: pick one and see what comes back. */
export function SkillsHeroSources({ skills }: HeroProps) {
  const [path, setPath] = useState(SOURCES[0]!.path);
  const [head, setHead] = useState<{ path: string; text: string }>();
  const source = SOURCES.find((entry) => entry.path === path) ?? SOURCES[0]!;

  useEffect(() => {
    let current = true;
    loadHead(path).then(
      (text) => current && setHead({ path, text }),
      () => current && setHead({ path, text: "This address did not load." }),
    );
    return () => {
      current = false;
    };
  }, [path]);

  const text = head?.path === path ? head.text : null;
  return (
    <div className={split}>
      <HeroText count={skills.length}>
        <SkillsHeroActions />
      </HeroText>
      <div className="ring-foreground/10 bg-background flex h-52 flex-col overflow-hidden rounded-xl ring-1">
        <div className="border-foreground/10 flex h-9 shrink-0 items-center gap-1 border-b ps-3 pe-1">
          <code
            className={cn(
              mono,
              "min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto text-xs whitespace-nowrap [&::-webkit-scrollbar]:hidden",
            )}
          >
            <span className="text-muted-foreground">assistant-ui.com</span>
            {source.path}
          </code>
          <LibraryCopyButton
            text={`${SITE}${source.path}`}
            label="Copy this address"
            className="size-7 rounded-full [&_svg]:size-3.5"
          />
        </div>
        <div
          role="group"
          aria-label="What an agent can read"
          className="flex shrink-0 gap-0.5 px-2 pt-2"
        >
          {SOURCES.map((entry) => (
            <button
              key={entry.path}
              type="button"
              aria-pressed={entry.path === path}
              onClick={() => setPath(entry.path)}
              className={cn(
                mono,
                fileTab,
                focus,
                "focus-visible:ring-inset",
                entry.path === path
                  ? "bg-foreground/[0.06]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <p className="shrink-0 px-3 pt-2 text-xs">{source.rule}</p>
        <pre
          aria-label={`The start of ${source.path}`}
          className={cn(
            mono,
            "text-muted-foreground min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_40%,transparent)] px-3 pt-2 text-xs leading-5 whitespace-pre-wrap",
          )}
        >
          {text ?? " "}
        </pre>
      </div>
    </div>
  );
}
